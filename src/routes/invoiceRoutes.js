const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authorize, auditLog } = require('../middleware/auth');

// --- Invoices --- (coordinator can view and create)
router.get('/', authorize('vendor', 'admin', 'coordinator'), invoiceController.getAll);
router.get('/overdue', authorize('vendor', 'admin', 'coordinator'), invoiceController.getOverdue);
router.get('/upcoming-installments', authorize('vendor', 'admin', 'coordinator'), invoiceController.getUpcomingInstallments);
router.get('/sales-summary', authorize('vendor', 'admin', 'coordinator'), invoiceController.getSalesSummary);
router.get('/:id', authorize('vendor', 'admin', 'coordinator'), invoiceController.getById);

// Public/Conditional creation handled in index.js middleware wrapper or here if moved entirely
// For now, keeping the protected create here if it's direct API usage
// router.post('/', ... ) 

router.post('/send-whatsapp-message', authorize('vendor', 'admin', 'coordinator'), invoiceController.sendWhatsAppMessage);
router.post('/:id/pay', authorize('vendor', 'admin', 'coordinator'), auditLog('payment', 'invoice'), invoiceController.recordPayment);
router.post('/:id/pay-all', authorize('vendor', 'admin'), auditLog('payment', 'invoice'), invoiceController.payAll);
router.post('/:id/send-whatsapp', authorize('vendor', 'admin', 'coordinator'), invoiceController.sendWhatsApp);

module.exports = router;
