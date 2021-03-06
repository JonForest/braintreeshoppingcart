/* global module, require */
'use strict';

const async = require('async');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const BrainTreePayments = require('./braintree_payments.js');

/**
 *
 * @param {Object} db
 * @param {Object} cart
 * @constructor
 */
const ShoppingCart = function(db, cart) {
    //TODO: Doc blocks
    let Product = db.model('Product');
    let Cart = db.model('Cart');
    let DiscountCode = db.model('DiscountCode');

    /**
     *
     * @param {Object} productDetails
     * @param {string} productDetails.productId
     * @param {number} productDetails.cost
     * @param {Function} done
     */
    this.addProduct = (productDetails, done) => {
        // If no items were passed in, then exit
        if (!productDetails || !productDetails.productId) {
            done(new Error('Failed as no product provided to add to the cart'), null);
            return;
        }

        //We have some items, add each one to the cart
        getProductAndRRP(productDetails, function(err, product) {
            if (err) {
                done(new Error('Failed to add the product to the cart'), null);
            } else {
                cart.products.push(product);
                calculateTotalCost(cart, done)
            }
        });

    }

    this.removeProduct = () => {
        //TODO: Placeholder.  No option to remove items from the cart in this version
    };

    /**
     *
     * @param nonce
     * @param done
     */
    this.makePaymentAttempt = (nonce, done) => {
        //Potentially time has past since we retrieved the cart, so let's refresh it in case some multi-tab stuff is
        //going on
        Cart.findById(cart.id, function(err, refreshedCart) {
            cart = refreshedCart;

            if (cart.status === 'paid') {
                done(new Error('Cart is already fully paid'), null);
            }
            const brainTreePayments = new BrainTreePayments(db, cart);
            brainTreePayments.makePayment(nonce, function (err, paymentAttempt) {
                if (err) {
                    done(err, paymentAttempt);
                } else {
                    // Need to update the cart
                    cart.status = 'paid';
                    cart.save(function (err) {
                        if (err) {
                            done(new Error('Failed to save the cart after a successful payment'), null);
                        } else {
                            done(null, paymentAttempt);
                        }
                    })
                }
            });
        })
    };

    /**
     *
     * @param {Object} productDetails
     * @param {string} productDetails.productId
     * @param {number} productDetails.cost
     * @param {Function} done
     */
    function getProductAndRRP(productDetails, done) {
        //Get the product
        Product.findOne({_id: mongoose.Types.ObjectId(productDetails.productId), status: 'live'}, function(err, product) {
            if (err) {
                logger.error('ShoppingCart:getProductAndRRP - findOne method.  Failed with "productTag": ' + itemTag + '  With error: ' + err.message);
                done(err, null);
            } else if (!product) {
                done(new Error('Product not found'), null);
            } else {
                done(null, {
                    product: product,
                    cost: productDetails.cost || product.rrp
                });
            }
        });
    }


    /**
     * Applies a discount to the cart assuming the discount code is valid (has status 'valid' and is in date)
     * @param {string} discountCodeString
     * @param {Function} done
     */
    this.applyDiscountCode = (discountCodeString, done) => {
        // Look up the discount code
        let today = new Date();
        DiscountCode.findOne(
            {code: discountCodeString, status: 'valid', startDate: {$lt: today}, endDate: {$gt: today}},
            function(err, discountCode) {
                if (err) {
                    logger.error('ShoppingCart:applyDiscountCode - findOne method.  Failed with "discountCode": ' + discountCodeString + '  With error: ' + err.message);
                    done(err, null);
                } else if (!discountCode) {
                    done(null, cart);
                } else {
                    cart.discountCode = discountCode;
                    cart.totalToPay = (cart.totalCartCost/100) * cart.discountCode.discountPercentage;
                    cart.save(function () {
                        done(null, cart);
                    })
                }
            }
        )
    };

    this.getCart = () => cart;

    /**
     * Used to calculate the cost of the cart on-demand.  Used internally at the moment after adding a new product.
     * @private
     * @param {Object} cart
     * @param {Function} done
     */
    function calculateTotalCost(cart, done) {
        // Populate it
        cart.populate('discountCode products.product', function() {
            if (cart.discountCode) {
                cart.totalToPay = (cart.totalCartCost / 100) * cart.discountCode.discountPercentage;
             } else {
                cart.totalToPay = cart.totalCartCost;
            }
            cart.save(done); //Callback receives (err, cart, numAffected) arguments
        });
    }

    this.getPaymentClientToken = (done) => {
        const brainTreePayments = new BrainTreePayments(db, cart);
        brainTreePayments.getClientToken(done);
    };

    //tODO: Remove at some point; leaving in now for a quick reference of public functions
    //return {
    //    addProduct: addProduct,
    //    removeProduct: removeProduct,
    //    applyDiscountCode: applyDiscountCode,
    //    getPaymentClientToken: getPaymentClientToken,
    //    makePaymentAttempt : makePaymentAttempt,
    //    getCart: getCart
    //}
};

module.exports = ShoppingCart;