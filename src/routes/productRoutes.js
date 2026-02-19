const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authorize, auditLog } = require('../middleware/auth');
const checkLimit = require('../middleware/checkLimit');
const { uploadSingle } = require('../middleware/upload');

// --- Products --- (coordinator can view and update stock)
router.get('/', productController.getAll);
router.get('/low-stock', authorize('vendor', 'admin', 'coordinator'), productController.getLowStock);
router.get('/summary', authorize('vendor', 'admin', 'coordinator'), productController.getStockSummary);

router.get('/categories', authorize('vendor', 'admin', 'coordinator'), productController.getCategories);
// router.get('/barcode/:code', ... ) // Moved to public
// router.get('/:id', ... ) // Moved to public

router.post('/', authorize('vendor', 'admin'), checkLimit('product'), auditLog('create', 'product'), productController.create);
router.put('/:id', authorize('vendor', 'admin'), auditLog('update', 'product'), productController.update);
router.delete('/:id', authorize('vendor', 'admin'), auditLog('delete', 'product'), productController.delete);
router.patch('/:id/stock', authorize('vendor', 'admin', 'coordinator'), auditLog('stock_change', 'product'), productController.updateStock);
router.post('/:id/upload-image', authorize('vendor', 'admin'), uploadSingle, productController.uploadImage);
router.delete('/:id/images/:imageUrl', authorize('vendor', 'admin'), productController.deleteImage);

// Restock
router.post('/:id/request-restock', authorize('vendor', 'admin'), productController.requestRestock);
router.post('/request-restock-bulk', authorize('vendor', 'admin'), productController.requestRestockBulk);

// Bulk Ops
router.post('/bulk-delete', authorize('vendor', 'admin'), auditLog('bulk_delete', 'product'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return next(require('../utils/AppError').badRequest('يرجى تحديد المنتجات'));
    const Product = require('../models/Product');
    const result = await Product.updateMany({ _id: { $in: ids }, ...req.tenantFilter }, { isActive: false });
    require('../utils/ApiResponse').success(res, { deletedCount: result.modifiedCount }, `تم حذف ${result.modifiedCount} منتج`);
  } catch (error) { next(error); }
});

module.exports = router;
