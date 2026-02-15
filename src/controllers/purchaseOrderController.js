/**
 * Purchase Order Controller
 */

const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');

class PurchaseOrderController {
  async getAll(req, res, next) {
    try {
      const { page, limit, skip } = Helpers.getPaginationParams(req.query);
      const filter = { ...req.tenantFilter };

      if (req.query.status) filter.status = req.query.status;
      if (req.query.supplier) filter.supplier = req.query.supplier;

      const [orders, total] = await Promise.all([
        PurchaseOrder.find(filter)
          .populate('supplier', 'name contactPerson')
          .populate('createdBy', 'name')
          .sort('-createdAt')
          .skip(skip)
          .limit(limit),
        PurchaseOrder.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, orders, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter })
        .populate('supplier')
        .populate('items.product')
        .populate('createdBy', 'name')
        .populate('approvedBy', 'name');

      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      ApiResponse.success(res, order);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { supplier, items, notes, expectedDeliveryDate } = req.body;

      const order = await PurchaseOrder.create({
        tenant: req.tenantId,
        supplier,
        items,
        notes,
        expectedDeliveryDate,
        createdBy: req.user._id,
      });

      ApiResponse.created(res, order, 'تم إنشاء أمر الشراء');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { items, notes, expectedDeliveryDate, status } = req.body;

      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter });
      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      if (order.status === 'received') {
        return next(AppError.badRequest('لا يمكن تعديل أمر مستلم'));
      }

      if (items) order.items = items;
      if (notes !== undefined) order.notes = notes;
      if (expectedDeliveryDate) order.expectedDeliveryDate = expectedDeliveryDate;
      if (status) order.status = status;

      await order.save();

      ApiResponse.success(res, order, 'تم تحديث أمر الشراء');
    } catch (error) {
      next(error);
    }
  }

  async receive(req, res, next) {
    try {
      const { receivedItems } = req.body; // Array: [{ itemId, receivedQuantity }]

      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter });
      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      if (order.status === 'received') {
        return next(AppError.badRequest('تم استلام هذا الأمر مسبقاً'));
      }

      // Update received quantities and stock
      for (const received of receivedItems) {
        const item = order.items.id(received.itemId);
        if (!item) continue;

        item.receivedQuantity = received.receivedQuantity;

        // Update product stock
        const product = await Product.findById(item.product);
        if (product) {
          if (item.variantId) {
            const variant = product.variants.id(item.variantId);
            if (variant) variant.stock += received.receivedQuantity;
          } else {
            product.stock.quantity += received.receivedQuantity;
          }
          await product.save();
        }
      }

      order.status = 'received';
      order.receivedDate = new Date();
      await order.save();

      ApiResponse.success(res, order, 'تم استلام أمر الشراء وتحديث المخزون');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter });
      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      if (order.status === 'received') {
        return next(AppError.badRequest('لا يمكن حذف أمر مستلم'));
      }

      await order.deleteOne();

      ApiResponse.success(res, null, 'تم حذف أمر الشراء');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PurchaseOrderController();
