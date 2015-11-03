# Braintree Ecommerce

[ ![Codeship Status for JonForest/braintreeshoppingcart](https://codeship.com/projects/fbe30000-6428-0133-f5dd-4e069a91af7c/status?branch=master)](https://codeship.com/projects/113034)

**Note: To run all unit tests successfully you will need to have the following environment variables configured**

* BT_MERCHANTID
* BT_PUBLICKEY
* BT_PRIVATEKEY
* BT_ENVIRONMENT

Example usage
## Instantiation
```
let Payments = require('inkub8_payments);
let payments = new Payments(mongooseConnection);
```

## Creating a cart and adding products
```
// Create a new cart.  Pass in the project Id.  Only one open cart per project allowed
let cart = payments.createNewCart(projectId);
cart.addProducts([{productTag: 'basic', discountCode: 'beta'}]);





