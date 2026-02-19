const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authorize, auditLog } = require('../middleware/auth');

// --- Customers --- (coordinator can view)
router.get('/', authorize('vendor', 'admin', 'coordinator'), customerController.getAll);
router.get('/top', authorize('vendor', 'admin', 'coordinator'), customerController.getTopCustomers);
router.get('/debtors', authorize('vendor', 'admin', 'coordinator'), customerController.getDebtors);
router.get('/:id', authorize('vendor', 'admin', 'coordinator'), customerController.getById);
router.get('/:id/transactions', authorize('vendor', 'admin', 'coordinator'), customerController.getTransactionHistory);
router.get('/:id/statement-pdf', authorize('vendor', 'admin', 'coordinator'), customerController.getStatementPDF);
router.get('/:id/credit-assessment', authorize('vendor', 'admin', 'coordinator'), customerController.getCreditAssessment);

// router.post('/', ... ) // Public/Conditional in index.js or check header here if moved completely

router.post('/:id/send-statement', authorize('vendor', 'admin'), customerController.sendStatement);
router.post('/:id/send-statement-pdf', authorize('vendor', 'admin', 'coordinator'), customerController.sendStatementPDF);
router.post('/:id/block-sales', authorize('vendor', 'admin'), customerController.blockSales);
router.post('/:id/unblock-sales', authorize('vendor', 'admin'), customerController.unblockSales);
router.put('/:id', authorize('vendor', 'admin'), auditLog('update', 'customer'), customerController.update);
router.put('/:id/whatsapp-preferences', authorize('vendor', 'admin'), customerController.updateWhatsAppPreferences);
router.delete('/:id', authorize('vendor', 'admin'), auditLog('delete', 'customer'), customerController.delete);

// Bulk Ops
router.post('/bulk-delete', authorize('vendor', 'admin'), auditLog('bulk_delete', 'customer'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return next(require('../utils/AppError').badRequest('يرجى تحديد العملاء'));
    const Customer = require('../models/Customer');
    const result = await Customer.updateMany({ _id: { $in: ids }, ...req.tenantFilter }, { isActive: false });
    require('../utils/ApiResponse').success(res, { deletedCount: result.modifiedCount }, `تم حذف ${result.modifiedCount} عميل`);
  } catch (error) { next(error); }
});

module.exports = router;
