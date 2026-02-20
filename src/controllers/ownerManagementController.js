/**
 * Owner Management Controller
 * Handles owner-side management of: Returns, KYC Documents, Support Messages
 */

const ReturnRequest = require('../models/ReturnRequest');
const Customer = require('../models/Customer');
const SupportMessage = require('../models/SupportMessage');
const Notification = require('../models/Notification');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');

class OwnerManagementController {
  // ═══════════════════════════════════════════
  //  RETURNS MANAGEMENT
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/manage/returns
   */
  getReturns = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 20, search } = req.query;
    const filter = { tenant: req.user.tenant };

    if (status) filter.status = status;

    const query = ReturnRequest.find(filter)
      .populate('customer', 'name phone')
      .populate('product', 'name images')
      .populate('invoice', 'invoiceNumber totalAmount')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const [returns, total] = await Promise.all([
      query,
      ReturnRequest.countDocuments(filter),
    ]);

    // If searching by customer name
    let filtered = returns;
    if (search) {
      const s = search.toLowerCase();
      filtered = returns.filter(
        (r) =>
          r.customer?.name?.toLowerCase().includes(s) ||
          r.invoice?.invoiceNumber?.toString().includes(s)
      );
    }

    // Stats
    const stats = await ReturnRequest.aggregate([
      { $match: { tenant: req.user.tenant } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statsMap = {};
    stats.forEach((s) => (statsMap[s._id] = s.count));

    ApiResponse.success(res, {
      returns: filtered,
      stats: {
        pending: statsMap.pending || 0,
        approved: statsMap.approved || 0,
        rejected: statsMap.rejected || 0,
        completed: statsMap.completed || 0,
        total,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  /**
   * PATCH /api/v1/manage/returns/:id
   * Approve, reject, or complete a return
   */
  updateReturn = catchAsync(async (req, res, next) => {
    const { status, adminNotes } = req.body;
    const allowedStatuses = ['approved', 'rejected', 'completed'];

    if (!status || !allowedStatuses.includes(status)) {
      return next(AppError.badRequest('حالة غير صالحة'));
    }

    const returnReq = await ReturnRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    }).populate('customer', 'name');

    if (!returnReq) return next(AppError.notFound('طلب المرتجع غير موجود'));

    returnReq.status = status;
    if (adminNotes) returnReq.adminNotes = adminNotes;
    returnReq.reviewedBy = req.user._id;
    returnReq.reviewedAt = new Date();

    // If approved, restore stock
    if (status === 'approved' || status === 'completed') {
      try {
        const product = await Product.findById(returnReq.product);
        if (product) {
          product.quantity = (product.quantity || 0) + returnReq.quantity;
          await product.save({ validateBeforeSave: false });
        }
      } catch { /* ignore */ }
    }

    await returnReq.save();

    // Notify customer
    const labels = { approved: 'تمت الموافقة', rejected: 'تم الرفض', completed: 'مكتمل' };
    await Notification.create({
      tenant: req.user.tenant,
      customerRecipient: returnReq.customer._id,
      type: 'order_status',
      title: `تحديث طلب المرتجع`,
      message: `طلب المرتجع الخاص بك: ${labels[status]}${adminNotes ? `. ${adminNotes}` : ''}`,
      icon: status === 'approved' ? 'check-circle' : status === 'rejected' ? 'x-circle' : 'package',
      color: status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'primary',
    });

    ApiResponse.success(res, returnReq, 'تم تحديث طلب المرتجع');
  });

  // ═══════════════════════════════════════════
  //  KYC DOCUMENT REVIEW
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/manage/documents
   * Get all customers with pending/all documents
   */
  getDocuments = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;

    const matchStage = { tenant: req.user.tenant, 'documents.0': { $exists: true } };

    const customers = await Customer.find(matchStage)
      .select('name phone documents profilePhoto tier')
      .sort({ 'documents.uploadedAt': -1 })
      .lean();

    // Flatten documents with customer info
    let allDocs = [];
    for (const cust of customers) {
      for (const doc of cust.documents || []) {
        if (status && doc.status !== status) continue;
        allDocs.push({
          _id: doc._id,
          customerId: cust._id,
          customerName: cust.name,
          customerPhone: cust.phone,
          customerPhoto: cust.profilePhoto,
          customerTier: cust.tier,
          type: doc.type,
          status: doc.status,
          url: doc.url,
          rejectionReason: doc.rejectionReason,
          uploadedAt: doc.uploadedAt,
        });
      }
    }

    // Sort by date desc
    allDocs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    // Stats
    const stats = { pending: 0, approved: 0, rejected: 0, total: 0 };
    for (const cust of customers) {
      for (const doc of cust.documents || []) {
        stats.total++;
        if (stats[doc.status] !== undefined) stats[doc.status]++;
      }
    }

    // Paginate
    const start = (page - 1) * limit;
    const paginated = allDocs.slice(start, start + Number(limit));

    ApiResponse.success(res, {
      documents: paginated,
      stats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: allDocs.length,
        totalPages: Math.ceil(allDocs.length / limit),
      },
    });
  });

  /**
   * PATCH /api/v1/manage/documents/:customerId/:docId
   * Approve or reject a document
   */
  reviewDocument = catchAsync(async (req, res, next) => {
    const { customerId, docId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return next(AppError.badRequest('حالة غير صالحة'));
    }

    const customer = await Customer.findOne({
      _id: customerId,
      tenant: req.user.tenant,
    });

    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    const doc = customer.documents.id(docId);
    if (!doc) return next(AppError.notFound('المستند غير موجود'));

    doc.status = status;
    if (status === 'rejected' && rejectionReason) {
      doc.rejectionReason = rejectionReason;
    }

    await customer.save({ validateBeforeSave: false });

    // Notify customer
    const typeLabels = { national_id: 'البطاقة الشخصية', passport: 'جواز السفر', utility_bill: 'فاتورة خدمات', contract: 'العقد', other: 'مستند' };
    await Notification.create({
      tenant: req.user.tenant,
      customerRecipient: customer._id,
      type: 'system',
      title: status === 'approved' ? 'تمت الموافقة على المستند' : 'تم رفض المستند',
      message: status === 'approved'
        ? `تمت الموافقة على ${typeLabels[doc.type] || 'المستند'} الخاص بك.`
        : `تم رفض ${typeLabels[doc.type] || 'المستند'}: ${rejectionReason || 'يرجى إعادة الرفع'}`,
      icon: status === 'approved' ? 'check-circle' : 'x-circle',
      color: status === 'approved' ? 'success' : 'danger',
    });

    ApiResponse.success(res, { document: doc }, `تم ${status === 'approved' ? 'قبول' : 'رفض'} المستند`);
  });

  // ═══════════════════════════════════════════
  //  SUPPORT MESSAGES
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/manage/support
   */
  getSupportMessages = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { tenant: req.user.tenant };

    if (status) filter.status = status;

    const [messages, total] = await Promise.all([
      SupportMessage.find(filter)
        .populate('customer', 'name phone profilePhoto tier')
        .populate('closedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      SupportMessage.countDocuments(filter),
    ]);

    // Stats
    const stats = await SupportMessage.aggregate([
      { $match: { tenant: req.user.tenant } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statsMap = {};
    stats.forEach((s) => (statsMap[s._id] = s.count));

    ApiResponse.success(res, {
      messages,
      stats: {
        open: statsMap.open || 0,
        replied: statsMap.replied || 0,
        closed: statsMap.closed || 0,
        total,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  /**
   * GET /api/v1/manage/support/:id
   */
  getSupportMessage = catchAsync(async (req, res, next) => {
    const message = await SupportMessage.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    }).populate('customer', 'name phone profilePhoto tier email');

    if (!message) return next(AppError.notFound('الرسالة غير موجودة'));

    ApiResponse.success(res, message);
  });

  /**
   * POST /api/v1/manage/support/:id/reply
   */
  replySupportMessage = catchAsync(async (req, res, next) => {
    const { message } = req.body;
    if (!message) return next(AppError.badRequest('الرسالة مطلوبة'));

    const supportMsg = await SupportMessage.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!supportMsg) return next(AppError.notFound('الرسالة غير موجودة'));

    supportMsg.replies.push({
      message,
      sender: 'vendor',
      senderName: req.user.name,
    });
    supportMsg.status = 'replied';
    await supportMsg.save();

    // Notify customer
    await Notification.create({
      tenant: req.user.tenant,
      customerRecipient: supportMsg.customer,
      type: 'support_reply',
      title: 'رد على رسالتك',
      message: `تم الرد على رسالتك "${supportMsg.subject}": ${message.substring(0, 150)}`,
      icon: 'message-circle',
      color: 'primary',
    });

    ApiResponse.success(res, supportMsg, 'تم إرسال الرد');
  });

  /**
   * PATCH /api/v1/manage/support/:id/close
   */
  closeSupportMessage = catchAsync(async (req, res, next) => {
    const supportMsg = await SupportMessage.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!supportMsg) return next(AppError.notFound('الرسالة غير موجودة'));

    supportMsg.status = 'closed';
    supportMsg.closedAt = new Date();
    supportMsg.closedBy = req.user._id;
    await supportMsg.save();

    ApiResponse.success(res, supportMsg, 'تم إغلاق التذكرة');
  });
}

module.exports = new OwnerManagementController();
