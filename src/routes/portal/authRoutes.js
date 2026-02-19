const express = require('express');
const router = express.Router();
const portalController = require('../../controllers/portalController');
const { protectCustomer } = require('../../middleware/portalAuth');

// ═══════════════ Public Routes ═══════════════
router.post('/login', portalController.login);
router.post('/register', portalController.register);
router.post('/activate', portalController.activate);

// ═══════════════ Protected Routes ═══════════════
router.use(protectCustomer);

// Dashboard
router.get('/dashboard', portalController.getDashboard);

// Invoices
router.get('/invoices', portalController.getInvoices);
router.get('/invoices/:id', portalController.getInvoiceDetails);

// Statement
router.get('/statement', portalController.getStatement);

// Profile
router.put('/profile', portalController.updateProfile);
router.put('/change-password', portalController.changePassword);

// Points & Rewards
router.get('/points', portalController.getPoints);

// Products & Shopping
router.get('/products', portalController.getProducts);
router.get('/products/:id', portalController.getProductDetails);
router.post('/cart/checkout', portalController.checkout);

module.exports = router;
