const express = require('express');
const router = express.Router();
const portalController = require('../../controllers/portalController');
const { protectCustomer } = require('../../middleware/portalAuth');

// Public Routes
router.post('/login', portalController.login);

// Protected Routes
router.use(protectCustomer);
router.get('/dashboard', portalController.getDashboard);
router.get('/products', portalController.getProducts);
router.post('/cart/checkout', portalController.checkout);

module.exports = router;
