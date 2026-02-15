/**
 * Stock Adjustment Controller
 */

const StockAdjustment = require('../models/StockAdjustment');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');

class StockAdjustmentController {
  async getAll(req, res, next) {
    try {
      const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);
      const filter = { ...req.tenantFilter };

      if (req.query.type) filter.type = req.query.type;
      if (req.query.product) filter.product = req.query.product;

      const [adjustments, total] = await Promise.all([
        StockAdjustment.find(filter)
          .sort(sort || '-createdAt')
          .skip(skip)
          .limit(limit)
          .populate('product', 'name sku price cost')
          .populate('user', 'name')
          .lean(),
        StockAdjustment.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, adjustments, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { productId, type, quantity, reason } = req.body;
      const tenantId = req.tenantId; // From auth/tenant middleware

      if (!productId || !type || !quantity) {
        return next(AppError.badRequest('جميع الحقول مطلوبة (المنتج، النوع، الكمية)'));
      }

      const product = await Product.findOne({ _id: productId, ...req.tenantFilter });
      if (!product) return next(AppError.notFound('المنتج غير موجود'));

      // Determine stock change direction
      let stockChange = 0;
      if (['damage', 'theft', 'loss', 'internal_use', 'correction_decrease'].includes(type)) {
        stockChange = -Math.abs(quantity);
      } else if (['correction_increase'].includes(type)) {
        stockChange = Math.abs(quantity);
      } else {
        return next(AppError.badRequest('نوع تسوية غير صالح'));
      }

      // Check if trying to reduce stock below 0 (optional based on business rule, usually allowed for corrections but warned)
      // For damage/theft, we assume user is recording reality, so we allow negative if counting mismatch, 
      // but usually we want to ensure we don't go negative if strict tracking.
      // Let's allow it but maybe warn? For now standard logic.
      
      const newStock = (product.stock?.quantity || 0) + stockChange;

      // Update Product
      product.stock = { ...product.stock, quantity: newStock };
      await product.save();

      // Create Record
      const adjustment = await StockAdjustment.create({
        tenant: tenantId,
        product: productId,
        user: req.user._id, // From auth middleware
        type,
        quantity: Math.abs(quantity),
        reason,
        costAtAdjustment: product.cost || 0,
      });

      ApiResponse.created(res, adjustment, 'تم تسجيل التسوية بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StockAdjustmentController();
