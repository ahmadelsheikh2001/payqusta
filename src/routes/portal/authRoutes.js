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
router.get('/invoices/:id/pdf', portalController.downloadInvoicePDF);
router.post('/invoices/:id/pay', portalController.payInvoice);

// Statement
router.get('/statement', portalController.getStatement);
router.get('/statement/pdf', portalController.downloadStatementPDF);

// Profile
router.put('/profile', portalController.updateProfile);
router.put('/change-password', portalController.changePassword);

// Documents (KYC)
router.get('/documents', portalController.getDocuments);
router.post('/documents', portalController.uploadDocument);
router.delete('/documents/:id', portalController.deleteDocument);

// Returns
router.get('/returns', portalController.getReturnRequests);
router.post('/returns', portalController.createReturnRequest);

// Addresses
router.get('/addresses', portalController.getAddresses);
router.post('/addresses', portalController.addAddress);
router.put('/addresses/:id', portalController.updateAddress);
router.delete('/addresses/:id', portalController.deleteAddress);

// Points & Rewards
router.get('/points', portalController.getPoints);
router.get('/points/history', portalController.getPointsHistory);

// Products & Shopping
router.get('/products', portalController.getProducts);
router.get('/products/:id', portalController.getProductDetails);
router.post('/cart/checkout', portalController.checkout);

// Orders
router.get('/orders', portalController.getOrders);
router.get('/orders/:id', portalController.getOrderDetails);
router.post('/orders/:id/reorder', portalController.reorder);

// Notifications
router.get('/notifications', portalController.getNotifications);
router.get('/notifications/unread-count', portalController.getUnreadCount);
router.put('/notifications/read-all', portalController.markAllNotificationsRead);
router.put('/notifications/:id/read', portalController.markNotificationRead);

// Wishlist
router.get('/wishlist', portalController.getWishlist);
router.post('/wishlist/:productId', portalController.toggleWishlist);

// Support
router.get('/support', portalController.getSupportMessages);
router.get('/support/:id', portalController.getSupportMessageById);
router.post('/support', portalController.sendSupportMessage);
router.post('/support/:id/reply', portalController.replyToSupportMessage);

// Reviews
router.get('/reviews', portalController.getMyReviews);
router.get('/reviews/store', portalController.getStoreReviews);
router.post('/reviews', portalController.submitReview);

// Coupons (validate from portal during checkout)
router.post('/coupons/validate', portalController.validateCoupon);

// Gamification
router.post('/gamification/daily-reward', portalController.claimDailyReward);

module.exports = router;
