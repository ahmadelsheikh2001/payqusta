/**
 * Coupon Controller — Promo Code Management
 */

const Coupon = require('../models/Coupon');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

class CouponController {
  /**
   * GET /api/v1/coupons
   * List all coupons for tenant
   */
  getAll = catchAsync(async (req, res) => {
    const { active, page = 1, limit = 20 } = req.query;
    const filter = { tenant: req.tenantId };
    if (active !== undefined) filter.isActive = active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Coupon.countDocuments(filter),
    ]);

    ApiResponse.success(res, {
      coupons,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  });

  /**
   * POST /api/v1/coupons
   * Create a new coupon
   */
  create = catchAsync(async (req, res, next) => {
    const {
      code, description, type, value, minOrderAmount, maxDiscountAmount,
      usageLimit, usagePerCustomer, startDate, endDate,
      applicableProducts, applicableCustomers,
    } = req.body;

    // Validate percentage
    if (type === 'percentage' && (value <= 0 || value > 100)) {
      return next(AppError.badRequest('نسبة الخصم يجب أن تكون بين 1 و 100'));
    }

    const coupon = await Coupon.create({
      tenant: req.tenantId,
      code: code.toUpperCase().trim(),
      description,
      type,
      value,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      usageLimit: usageLimit || null,
      usagePerCustomer: usagePerCustomer || 1,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      applicableProducts: applicableProducts || [],
      applicableCustomers: applicableCustomers || [],
      createdBy: req.user._id,
    });

    ApiResponse.success(res, { coupon }, 'تم إنشاء الكوبون بنجاح', 201);
  });

  /**
   * GET /api/v1/coupons/:id
   * Get coupon details
   */
  getById = catchAsync(async (req, res, next) => {
    const coupon = await Coupon.findOne({ _id: req.params.id, tenant: req.tenantId })
      .populate('createdBy', 'name')
      .populate('applicableProducts', 'name')
      .populate('applicableCustomers', 'name phone');

    if (!coupon) return next(AppError.notFound('الكوبون غير موجود'));
    ApiResponse.success(res, { coupon });
  });

  /**
   * PUT /api/v1/coupons/:id
   * Update coupon
   */
  update = catchAsync(async (req, res, next) => {
    const allowed = [
      'description', 'isActive', 'minOrderAmount', 'maxDiscountAmount',
      'usageLimit', 'usagePerCustomer', 'endDate', 'value',
    ];
    const updates = {};
    allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.id, tenant: req.tenantId },
      updates,
      { new: true, runValidators: true }
    );
    if (!coupon) return next(AppError.notFound('الكوبون غير موجود'));
    ApiResponse.success(res, { coupon }, 'تم تحديث الكوبون');
  });

  /**
   * DELETE /api/v1/coupons/:id
   * Delete coupon
   */
  delete = catchAsync(async (req, res, next) => {
    const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, tenant: req.tenantId });
    if (!coupon) return next(AppError.notFound('الكوبون غير موجود'));
    ApiResponse.success(res, null, 'تم حذف الكوبون');
  });

  /**
   * POST /api/v1/coupons/validate
   * Validate a coupon code and return discount amount
   */
  validate = catchAsync(async (req, res, next) => {
    const { code, orderTotal, customerId } = req.body;

    if (!code) return next(AppError.badRequest('يرجى إدخال كود الخصم'));
    if (!orderTotal || orderTotal <= 0) return next(AppError.badRequest('المبلغ غير صالح'));

    const coupon = await Coupon.findOne({
      tenant: req.tenantId,
      code: code.toUpperCase().trim(),
    });

    if (!coupon) return next(AppError.notFound('كود الخصم غير صالح'));

    // Check validity
    const validity = coupon.isValid();
    if (!validity.valid) return next(AppError.badRequest(validity.reason));

    // Check minimum order amount
    if (orderTotal < coupon.minOrderAmount) {
      return next(AppError.badRequest(
        `الحد الأدنى للطلب لاستخدام هذا الكوبون هو ${coupon.minOrderAmount} ج.م`
      ));
    }

    // Check customer-specific restrictions
    if (coupon.applicableCustomers.length > 0 && customerId) {
      if (!coupon.applicableCustomers.some(id => id.toString() === customerId)) {
        return next(AppError.badRequest('هذا الكوبون غير مخصص لك'));
      }
    }

    // Check per-customer usage limit
    if (customerId && coupon.usagePerCustomer !== null) {
      const customerUsages = coupon.usages.filter(u => u.customer?.toString() === customerId).length;
      if (customerUsages >= coupon.usagePerCustomer) {
        return next(AppError.badRequest('لقد استخدمت هذا الكوبون بالحد الأقصى المسموح'));
      }
    }

    const discountAmount = coupon.calculateDiscount(orderTotal);
    const finalTotal = orderTotal - discountAmount;

    ApiResponse.success(res, {
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
      },
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalTotal: parseFloat(finalTotal.toFixed(2)),
      savings: parseFloat(discountAmount.toFixed(2)),
    }, `وفرت ${discountAmount.toFixed(2)} ج.م`);
  });

  /**
   * GET /api/v1/coupons/stats
   * Get coupon usage statistics
   */
  getStats = catchAsync(async (req, res) => {
    const tenantId = req.tenantId;

    const [total, active, expired, totalSavings] = await Promise.all([
      Coupon.countDocuments({ tenant: tenantId }),
      Coupon.countDocuments({ tenant: tenantId, isActive: true, $or: [{ endDate: null }, { endDate: { $gt: new Date() } }] }),
      Coupon.countDocuments({ tenant: tenantId, endDate: { $lt: new Date() } }),
      Coupon.aggregate([
        { $match: { tenant: tenantId } },
        { $unwind: '$usages' },
        { $group: { _id: null, total: { $sum: '$usages.discountAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    ApiResponse.success(res, {
      total,
      active,
      expired,
      totalUsages: totalSavings[0]?.count || 0,
      totalSavings: totalSavings[0]?.total || 0,
    });
  });
}

module.exports = new CouponController();
