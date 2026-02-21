/**
 * Review Controller — Customer Reviews & Ratings Management
 */

const Review = require('../models/Review');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

class ReviewController {
  /**
   * GET /api/v1/reviews
   * Get all reviews for tenant (vendor view, paginated)
   */
  getAll = catchAsync(async (req, res) => {
    const { status, type, rating, productId, page = 1, limit = 20 } = req.query;

    const filter = { tenant: req.tenantId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (rating) filter.rating = parseInt(rating);
    if (productId) filter.product = productId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('customer', 'name phone avatar')
        .populate('product', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(filter),
    ]);

    ApiResponse.success(res, {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  });

  /**
   * GET /api/v1/reviews/stats
   * Get review statistics for tenant
   */
  getStats = catchAsync(async (req, res) => {
    const tenantId = req.tenantId;

    const [total, byStatus, byRating, avgResult] = await Promise.all([
      Review.countDocuments({ tenant: tenantId }),
      Review.aggregate([
        { $match: { tenant: tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { tenant: tenantId, status: 'approved' } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      Review.aggregate([
        { $match: { tenant: tenantId, status: 'approved' } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap = {};
    byStatus.forEach((s) => { statusMap[s._id] = s.count; });

    const ratingMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    byRating.forEach((r) => { ratingMap[r._id] = r.count; });

    ApiResponse.success(res, {
      total,
      pending: statusMap.pending || 0,
      approved: statusMap.approved || 0,
      rejected: statusMap.rejected || 0,
      avgRating: avgResult[0]?.avg ? parseFloat(avgResult[0].avg.toFixed(1)) : 0,
      totalApproved: avgResult[0]?.count || 0,
      ratingDistribution: ratingMap,
    });
  });

  /**
   * GET /api/v1/reviews/:id
   * Get single review
   */
  getById = catchAsync(async (req, res, next) => {
    const review = await Review.findOne({ _id: req.params.id, tenant: req.tenantId })
      .populate('customer', 'name phone avatar')
      .populate('product', 'name images')
      .populate('reply.repliedBy', 'name');

    if (!review) return next(AppError.notFound('المراجعة غير موجودة'));
    ApiResponse.success(res, { review });
  });

  /**
   * PATCH /api/v1/reviews/:id/status
   * Approve or reject a review
   */
  updateStatus = catchAsync(async (req, res, next) => {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return next(AppError.badRequest('حالة غير صالحة (approved/rejected)'));
    }

    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, tenant: req.tenantId },
      { status },
      { new: true }
    );

    if (!review) return next(AppError.notFound('المراجعة غير موجودة'));
    ApiResponse.success(res, { review }, `تم ${status === 'approved' ? 'قبول' : 'رفض'} المراجعة`);
  });

  /**
   * POST /api/v1/reviews/:id/reply
   * Vendor replies to a review
   */
  addReply = catchAsync(async (req, res, next) => {
    const { body } = req.body;
    if (!body?.trim()) return next(AppError.badRequest('نص الرد مطلوب'));

    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, tenant: req.tenantId },
      {
        reply: {
          body: body.trim(),
          repliedAt: new Date(),
          repliedBy: req.user._id,
        },
      },
      { new: true }
    ).populate('customer', 'name');

    if (!review) return next(AppError.notFound('المراجعة غير موجودة'));
    ApiResponse.success(res, { review }, 'تم إضافة الرد بنجاح');
  });

  /**
   * DELETE /api/v1/reviews/:id
   * Delete a review
   */
  delete = catchAsync(async (req, res, next) => {
    const review = await Review.findOneAndDelete({ _id: req.params.id, tenant: req.tenantId });
    if (!review) return next(AppError.notFound('المراجعة غير موجودة'));
    ApiResponse.success(res, null, 'تم حذف المراجعة');
  });

  /**
   * GET /api/v1/reviews/product/:productId
   * Get approved reviews for a product (public)
   */
  getProductReviews = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const filter = {
      tenant: req.tenantId,
      product: productId,
      status: 'approved',
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total, avgResult] = await Promise.all([
      Review.find(filter)
        .populate('customer', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: filter },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ]);

    ApiResponse.success(res, {
      reviews,
      avgRating: avgResult[0]?.avg ? parseFloat(avgResult[0].avg.toFixed(1)) : 0,
      total,
      pages: Math.ceil(total / parseInt(limit)),
    });
  });
}

module.exports = new ReviewController();
