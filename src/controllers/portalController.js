/**
 * Customer Portal Controller
 * Handles authentication, dashboard, shopping, invoices, statements, and profile for customers
 */

const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const ReturnRequest = require('../models/ReturnRequest');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const Helpers = require('../utils/helpers');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper to generate token for customer
const generateToken = (id) => {
  return jwt.sign({ id, role: 'customer' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Helper to resolve tenant from slug or header
const resolveTenant = async (req) => {
  let tenantId = req.headers['x-tenant-id'];
  const slug = req.body.tenantSlug || req.body.storeCode;

  if (!tenantId && slug) {
    const tenant = await Tenant.findOne({ slug, isActive: true });
    if (!tenant) return null;
    tenantId = tenant._id;
  }

  return tenantId;
};

class PortalController {
  // ═══════════════════════════════════════════
  //  AUTH ENDPOINTS
  // ═══════════════════════════════════════════

  /**
   * POST /api/v1/portal/login
   */
  login = catchAsync(async (req, res, next) => {
    const { phone, password, tenantSlug, storeCode } = req.body;

    if (!phone || !password) {
      return next(AppError.badRequest('رقم الهاتف وكلمة المرور مطلوبين'));
    }

    const tenantId = await resolveTenant(req);
    const query = { phone };
    if (tenantId) query.tenant = tenantId;

    const customer = await Customer.findOne(query).select('+password').populate('tenant', 'name slug branding');

    if (!customer) {
      return next(AppError.unauthorized('بيانات الدخول غير صحيحة'));
    }

    if (!customer.password) {
      return next(AppError.unauthorized('لم يتم تفعيل حسابك بعد. استخدم "تفعيل حساب" لإنشاء كلمة مرور'));
    }

    if (!(await customer.matchPassword(password))) {
      return next(AppError.unauthorized('بيانات الدخول غير صحيحة'));
    }

    if (!customer.isActive) {
      return next(AppError.unauthorized('تم تعطيل هذا الحساب'));
    }

    const token = generateToken(customer._id);

    customer.lastLogin = new Date();
    await customer.save({ validateBeforeSave: false });

    customer.password = undefined;

    ApiResponse.success(res, {
      token,
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        tier: customer.tier,
        balance: Math.max(0, customer.financials.creditLimit - customer.financials.outstandingBalance),
        creditLimit: customer.financials.creditLimit,
        outstanding: customer.financials.outstandingBalance,
        points: customer.gamification?.points || 0,
        badges: customer.gamification?.badges || [],
        salesBlocked: customer.salesBlocked || false,
      },
      tenant: customer.tenant
    }, 'تم تسجيل الدخول بنجاح');
  });

  /**
   * POST /api/v1/portal/register
   * Register a brand new customer
   */
  register = catchAsync(async (req, res, next) => {
    const { name, phone, password, confirmPassword, tenantSlug, storeCode } = req.body;

    if (!name || !phone || !password) {
      return next(AppError.badRequest('الاسم ورقم الهاتف وكلمة المرور مطلوبين'));
    }

    if (password !== confirmPassword) {
      return next(AppError.badRequest('كلمة المرور وتأكيدها غير متطابقين'));
    }

    if (password.length < 6) {
      return next(AppError.badRequest('كلمة المرور يجب أن تكون 6 أحرف على الأقل'));
    }

    const slug = tenantSlug || storeCode;
    if (!slug) {
      return next(AppError.badRequest('كود المتجر مطلوب'));
    }

    const tenant = await Tenant.findOne({ slug, isActive: true });
    if (!tenant) {
      return next(AppError.notFound('كود المتجر غير صحيح'));
    }

    // Check if phone already registered for this tenant
    const existing = await Customer.findOne({ tenant: tenant._id, phone });
    if (existing) {
      if (existing.password) {
        return next(AppError.badRequest('رقم الهاتف مسجل بالفعل. استخدم تسجيل الدخول'));
      } else {
        return next(AppError.badRequest('رقم الهاتف مسجل بالفعل. استخدم "تفعيل حساب" لإنشاء كلمة مرور'));
      }
    }

    // Create new customer
    const customer = await Customer.create({
      tenant: tenant._id,
      name: name.trim(),
      phone: phone.trim(),
      password,
      isPortalActive: true,
      isActive: true,
      lastLogin: new Date(),
    });

    const token = generateToken(customer._id);

    ApiResponse.created(res, {
      token,
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        tier: customer.tier,
        balance: customer.financials.creditLimit,
        creditLimit: customer.financials.creditLimit,
        outstanding: 0,
        points: 0,
        badges: [],
        salesBlocked: false,
      },
      tenant: { _id: tenant._id, name: tenant.name, slug: tenant.slug, branding: tenant.branding }
    }, 'تم إنشاء حسابك بنجاح');
  });

  /**
   * POST /api/v1/portal/activate
   * Activate an existing customer account (added by vendor) by setting a password
   */
  activate = catchAsync(async (req, res, next) => {
    const { phone, newPassword, confirmPassword, tenantSlug, storeCode } = req.body;

    if (!phone || !newPassword) {
      return next(AppError.badRequest('رقم الهاتف وكلمة المرور الجديدة مطلوبين'));
    }

    if (newPassword !== confirmPassword) {
      return next(AppError.badRequest('كلمة المرور وتأكيدها غير متطابقين'));
    }

    if (newPassword.length < 6) {
      return next(AppError.badRequest('كلمة المرور يجب أن تكون 6 أحرف على الأقل'));
    }

    const slug = tenantSlug || storeCode;
    if (!slug) {
      return next(AppError.badRequest('كود المتجر مطلوب'));
    }

    const tenant = await Tenant.findOne({ slug, isActive: true });
    if (!tenant) {
      return next(AppError.notFound('كود المتجر غير صحيح'));
    }

    const customer = await Customer.findOne({ tenant: tenant._id, phone }).select('+password');
    if (!customer) {
      return next(AppError.notFound('لا يوجد حساب بهذا الرقم. تأكد من كود المتجر ورقم الهاتف'));
    }

    if (customer.password) {
      return next(AppError.badRequest('هذا الحساب مفعل بالفعل. استخدم تسجيل الدخول'));
    }

    if (!customer.isActive) {
      return next(AppError.unauthorized('تم تعطيل هذا الحساب. يرجى مراجعة الإدارة'));
    }

    // Set password and activate portal
    customer.password = newPassword;
    customer.isPortalActive = true;
    customer.lastLogin = new Date();
    await customer.save();

    const token = generateToken(customer._id);

    ApiResponse.success(res, {
      token,
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        tier: customer.tier,
        balance: Math.max(0, customer.financials.creditLimit - customer.financials.outstandingBalance),
        creditLimit: customer.financials.creditLimit,
        outstanding: customer.financials.outstandingBalance,
        points: customer.gamification?.points || 0,
        badges: customer.gamification?.badges || [],
        salesBlocked: customer.salesBlocked || false,
      },
      tenant: { _id: tenant._id, name: tenant.name, slug: tenant.slug, branding: tenant.branding }
    }, 'تم تفعيل حسابك بنجاح');
  });

  // ═══════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/portal/dashboard
   */
  getDashboard = catchAsync(async (req, res, next) => {
    const customerId = req.user.id;

    const customer = await Customer.findById(customerId).populate({
      path: 'tenant',
      select: 'name slug branding businessInfo settings subscription.plan owner',
      populate: { path: 'owner', select: 'name phone email avatar' }
    });
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    // Get upcoming installments
    const invoices = await Invoice.find({
      customer: customerId,
      status: { $in: ['pending', 'partially_paid', 'overdue'] }
    }).sort('installments.dueDate');

    const upcomingInstallments = [];
    invoices.forEach(inv => {
      (inv.installments || []).forEach(inst => {
        if (inst.status !== 'paid') {
          upcomingInstallments.push({
            invoiceId: inv._id,
            invoiceNumber: inv.invoiceNumber,
            amount: inst.amount - (inst.paidAmount || 0),
            dueDate: inst.dueDate,
            installmentNumber: inst.installmentNumber,
            status: inst.status
          });
        }
      });
    });

    upcomingInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Get recent orders
    const recentOrders = await Invoice.find({ customer: customerId })
      .sort('-createdAt')
      .limit(5)
      .select('invoiceNumber totalAmount paidAmount remainingAmount status createdAt');

    // Stats
    const totalInvoices = await Invoice.countDocuments({ customer: customerId });
    const paidInvoices = await Invoice.countDocuments({ customer: customerId, status: 'paid' });

    // Store/Tenant info for dashboard
    const tenantId = customer.tenant._id || customer.tenant;

    // Get Active Categories (Aggregation from Products for counts)
    const categoryCounts = await Product.aggregate([
      {
        $match: {
          tenant: new mongoose.Types.ObjectId(tenantId),
          isActive: true
        }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);

    // Map counts for easy lookup
    const countMap = {};
    categoryCounts.forEach(c => { countMap[c._id] = c.count; });

    // Get categories from Tenant Settings (Owner defined)
    let categoriesList = [];
    // Ensure we handle potential null/undefined
    const settingsCategories = customer.tenant?.settings?.categories || [];

    console.log('[PORTAL_DASHBOARD] Tenant:', tenantId);
    console.log('[PORTAL_DASHBOARD] Settings Categories:', settingsCategories);
    console.log('[PORTAL_DASHBOARD] Aggregated Counts:', categoryCounts);

    if (settingsCategories.length > 0) {
      // Use settings categories directly (they should be strings now)
      // Filter out any non-string values just in case DB has mixed data
      categoriesList = settingsCategories.filter(c => typeof c === 'string');
    } else {
      // Fallback to aggregation results
      categoriesList = categoryCounts.map(c => c._id);
    }

    const categories = categoriesList.map(catName => ({
      name: catName,
      slug: catName,
      count: countMap[catName] || 0,
      icon: null,
      image: null
    }));

    // Get Featured/Recent Products
    const recentProducts = await Product.find({
      tenant: tenantId,
      isActive: true
    })
      .sort('-createdAt')
      .limit(8)
      .select('name slug price images category description hasVariants variants');

    // Store/Tenant info for dashboard
    const tenant = customer.tenant;
    const storeInfo = {
      name: tenant?.name || '',
      slug: tenant?.slug || '',
      logo: tenant?.branding?.logo || null,
      primaryColor: tenant?.branding?.primaryColor || '#6366f1',
      secondaryColor: tenant?.branding?.secondaryColor || '#10b981',
      phone: tenant?.businessInfo?.phone || '',
      email: tenant?.businessInfo?.email || '',
      address: tenant?.businessInfo?.address || '',
      plan: tenant?.subscription?.plan || 'free',
      owner: tenant?.owner ? {
        name: tenant.owner.name,
        phone: tenant.owner.phone,
        email: tenant.owner.email,
        avatar: tenant.owner.avatar,
      } : null,
    };

    // Product count for store
    const totalProducts = await Product.countDocuments({ tenant: customer.tenant._id || customer.tenant, isActive: true });
    // Total customers in same store
    const totalCustomers = await Customer.countDocuments({ tenant: customer.tenant._id || customer.tenant, isActive: true });

    ApiResponse.success(res, {
      profile: {
        name: customer.name,
        phone: customer.phone,
        tier: customer.tier,
        points: customer.gamification?.points || 0,
        badges: customer.gamification?.badges || [],
        memberSince: customer.createdAt,
      },
      wallet: {
        creditLimit: customer.financials.creditLimit,
        usedCredit: customer.financials.outstandingBalance,
        availableCredit: Math.max(0, customer.financials.creditLimit - customer.financials.outstandingBalance),
        totalPurchases: customer.financials.totalPurchases,
        totalPaid: customer.financials.totalPaid,
        currency: customer.tenant?.settings?.currency || 'EGP'
      },
      stats: {
        totalInvoices,
        paidInvoices,
        pendingInstallments: upcomingInstallments.length,
      },
      store: storeInfo,
      storeStats: {
        totalProducts,
        totalCustomers,
      },
      upcomingInstallments: upcomingInstallments.slice(0, 5),
      recentOrders,
      salesBlocked: customer.salesBlocked || false,
      salesBlockedReason: customer.salesBlockedReason,
    });
  });

  // ═══════════════════════════════════════════
  //  INVOICES
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/portal/invoices
   */
  getInvoices = catchAsync(async (req, res, next) => {
    const customerId = req.user.id;
    const { page = 1, limit = 15, status } = req.query;

    const filter = { customer: customerId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .select('invoiceNumber totalAmount paidAmount remainingAmount status paymentMethod createdAt installments')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Invoice.countDocuments(filter)
    ]);

    ApiResponse.success(res, {
      invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  });

  /**
   * GET /api/v1/portal/invoices/:id
   */
  getInvoiceDetails = catchAsync(async (req, res, next) => {
    const customerId = req.user.id;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      customer: customerId
    }).populate('items.product', 'name images thumbnail');

    if (!invoice) {
      return next(AppError.notFound('الفاتورة غير موجودة'));
    }

    ApiResponse.success(res, invoice);
  });

  // ═══════════════════════════════════════════
  //  STATEMENT (كشف حساب)
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/portal/statement
   */
  getStatement = catchAsync(async (req, res, next) => {
    const customerId = req.user.id;
    const { startDate, endDate } = req.query;

    const customer = await Customer.findById(customerId);
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const invoiceFilter = { customer: customerId };
    if (Object.keys(dateFilter).length > 0) {
      invoiceFilter.createdAt = dateFilter;
    }

    const invoices = await Invoice.find(invoiceFilter)
      .select('invoiceNumber totalAmount paidAmount remainingAmount status paymentMethod createdAt payments')
      .sort('createdAt');

    // Build statement entries (purchases + payments in chronological order)
    const entries = [];

    invoices.forEach(inv => {
      // Purchase entry
      entries.push({
        date: inv.createdAt,
        type: 'purchase',
        description: `فاتورة #${inv.invoiceNumber}`,
        debit: inv.totalAmount,
        credit: 0,
        invoiceId: inv._id,
        invoiceNumber: inv.invoiceNumber,
      });

      // Payment entries
      (inv.payments || []).forEach(payment => {
        if (!startDate || new Date(payment.date) >= new Date(startDate)) {
          if (!endDate || new Date(payment.date) <= new Date(endDate)) {
            entries.push({
              date: payment.date,
              type: 'payment',
              description: `سداد لفاتورة #${inv.invoiceNumber} (${payment.method === 'cash' ? 'نقدي' : payment.method === 'transfer' ? 'تحويل' : payment.method})`,
              debit: 0,
              credit: payment.amount,
              invoiceId: inv._id,
              invoiceNumber: inv.invoiceNumber,
            });
          }
        }
      });
    });

    // Sort by date
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let runningBalance = 0;
    entries.forEach(entry => {
      runningBalance += entry.debit - entry.credit;
      entry.balance = runningBalance;
    });

    // Summary
    const totalPurchases = entries.filter(e => e.type === 'purchase').reduce((sum, e) => sum + e.debit, 0);
    const totalPayments = entries.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.credit, 0);

    ApiResponse.success(res, {
      customer: {
        name: customer.name,
        phone: customer.phone,
      },
      summary: {
        totalPurchases,
        totalPayments,
        currentBalance: customer.financials.outstandingBalance,
        creditLimit: customer.financials.creditLimit,
        availableCredit: Math.max(0, customer.financials.creditLimit - customer.financials.outstandingBalance),
      },
      entries,
      period: {
        from: startDate || (entries.length > 0 ? entries[0].date : null),
        to: endDate || new Date(),
      }
    });
  });

  // ═══════════════════════════════════════════
  //  PROFILE
  // ═══════════════════════════════════════════

  /**
   * PUT /api/v1/portal/profile
   */
  updateProfile = catchAsync(async (req, res, next) => {
    const { name, email, address, profilePhoto, dateOfBirth, gender, whatsapp, bio } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim();
    if (address !== undefined) updates.address = address.trim();
    if (profilePhoto !== undefined) updates.profilePhoto = profilePhoto;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updates.gender = gender;
    if (whatsapp !== undefined) updates.whatsappNumber = whatsapp.trim();
    if (bio !== undefined) updates.bio = bio.trim();

    if (Object.keys(updates).length === 0) {
      return next(AppError.badRequest('لا توجد بيانات للتحديث'));
    }

    const customer = await Customer.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    ApiResponse.success(res, {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      whatsapp: customer.whatsappNumber,
    }, 'تم تحديث بياناتك بنجاح');
  });

  /**
   * GET /api/v1/portal/documents
   */
  getDocuments = catchAsync(async (req, res, next) => {
    const customer = await Customer.findById(req.user.id).select('documents');
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    ApiResponse.success(res, customer.documents || []);
  });

  /**
   * POST /api/v1/portal/documents
   */
  uploadDocument = catchAsync(async (req, res, next) => {
    const { type, file } = req.body;

    if (!type || !file) {
      return next(AppError.badRequest('نوع المستند والملف مطلوبين'));
    }

    const validTypes = ['national_id', 'passport', 'utility_bill', 'contract', 'other'];
    if (!validTypes.includes(type)) {
      return next(AppError.badRequest('نوع المستند غير صحيح'));
    }

    // Basic Base64 validation (check if string starts with data:image or data:application/pdf)
    if (!file.startsWith('data:')) {
      return next(AppError.badRequest('صيغة الملف غير صحيحة'));
    }

    const customer = await Customer.findById(req.user.id);
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    // Check if document of same type already exists and is pending or approved
    const existingDoc = customer.documents.find(d => d.type === type && d.status !== 'rejected');
    if (existingDoc && type !== 'other') {
      return next(AppError.badRequest('يوجد مستند من هذا النوع قيد المراجعة أو تم قبوله بالفعل'));
    }

    customer.documents.push({
      type,
      url: file,
      status: 'pending',
      uploadedAt: new Date()
    });

    await customer.save();

    ApiResponse.success(res, customer.documents, 'تم رفع المستند بنجاح');
  });

  /**
   * DELETE /api/v1/portal/documents/:id
   */
  deleteDocument = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const customer = await Customer.findById(req.user.id);
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    const docIndex = customer.documents.findIndex(d => d._id.toString() === id);
    if (docIndex === -1) {
      return next(AppError.notFound('المستند غير موجود'));
    }

    if (customer.documents[docIndex].status !== 'pending' && customer.documents[docIndex].status !== 'rejected') {
      return next(AppError.badRequest('لا يمكن حذف مستند تم قبوله'));
    }

    customer.documents.splice(docIndex, 1);
    await customer.save();

    ApiResponse.success(res, customer.documents, 'تم حذف المستند بنجاح');
  });

  /**
   * POST /api/v1/portal/returns
   */
  createReturnRequest = catchAsync(async (req, res, next) => {
    const { invoiceId, productId, quantity, reason, description } = req.body;

    if (!invoiceId || !productId || !quantity || !reason) {
      return next(AppError.badRequest('جميع البيانات مطلوبة'));
    }

    const invoice = await Invoice.findOne({ _id: invoiceId, customer: req.user.id });
    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    const item = invoice.items.find(i => i.product.toString() === productId);
    if (!item) return next(AppError.badRequest('المنتج غير موجود في الفاتورة'));

    if (quantity > item.quantity) {
      return next(AppError.badRequest('الكمية المطلوبة أكبر من الكمية المشتراة'));
    }

    // Check if return period expired (e.g. 14 days) - Optional logic here

    // Check if already requested for this item/quantity 
    // (Simplification: just create request. In real app, we check remaining quantity available for return)

    const returnRequest = await ReturnRequest.create({
      tenant: req.tenant._id,
      customer: req.user.id,
      invoice: invoiceId,
      product: productId,
      variant: item.variant, // Assuming invoice item has variant info if needed
      quantity,
      reason,
      description,
      status: 'pending'
    });

    ApiResponse.success(res, returnRequest, 'تم تقديم طلب الإرجاع بنجاح');
  });

  /**
   * GET /api/v1/portal/returns
   */
  getReturnRequests = catchAsync(async (req, res, next) => {
    const requests = await ReturnRequest.find({ customer: req.user.id })
      .populate('product', 'name images')
      .populate('invoice', 'invoiceNumber date')
      .sort('-createdAt');

    ApiResponse.success(res, requests);
  });

  /**
   * Address Book Methods
   */
  getAddresses = catchAsync(async (req, res, next) => {
    const customer = await Customer.findById(req.user.id).select('addresses');
    ApiResponse.success(res, customer.addresses);
  });

  addAddress = catchAsync(async (req, res, next) => {
    const { label, street, city, state, zipCode, isDefault } = req.body;

    if (!street || !city) {
      return next(AppError.badRequest('العنوان والمدينة مطلوبان'));
    }

    const customer = await Customer.findById(req.user.id);

    if (isDefault) {
      customer.addresses.forEach(addr => addr.isDefault = false);
    }

    customer.addresses.push({ label, street, city, state, zipCode, isDefault });
    await customer.save();

    ApiResponse.success(res, customer.addresses, 'تم إضافة العنوان بنجاح');
  });

  updateAddress = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { label, street, city, state, zipCode, isDefault } = req.body;

    const customer = await Customer.findById(req.user.id);
    const address = customer.addresses.id(id);

    if (!address) {
      return next(AppError.notFound('العنوان غير موجود'));
    }

    if (isDefault) {
      customer.addresses.forEach(addr => addr.isDefault = false);
    }

    address.label = label || address.label;
    address.street = street || address.street;
    address.city = city || address.city;
    address.state = state || address.state;
    address.zipCode = zipCode || address.zipCode;
    if (typeof isDefault !== 'undefined') address.isDefault = isDefault;

    await customer.save();
    ApiResponse.success(res, customer.addresses, 'تم تحديث العنوان بنجاح');
  });

  deleteAddress = catchAsync(async (req, res, next) => {
    const customer = await Customer.findById(req.user.id);
    customer.addresses.pull(req.params.id);
    await customer.save();
    ApiResponse.success(res, customer.addresses, 'تم حذف العنوان بنجاح');
  });

  /**
   * PUT /api/v1/portal/change-password
   */
  changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(AppError.badRequest('كلمة المرور الحالية والجديدة مطلوبين'));
    }

    if (newPassword !== confirmPassword) {
      return next(AppError.badRequest('كلمة المرور الجديدة وتأكيدها غير متطابقين'));
    }

    if (newPassword.length < 6) {
      return next(AppError.badRequest('كلمة المرور يجب أن تكون 6 أحرف على الأقل'));
    }

    const customer = await Customer.findById(req.user.id).select('+password');
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    const isMatch = await customer.matchPassword(currentPassword);
    if (!isMatch) {
      return next(AppError.badRequest('كلمة المرور الحالية غير صحيحة'));
    }

    customer.password = newPassword;
    await customer.save();

    ApiResponse.success(res, null, 'تم تغيير كلمة المرور بنجاح');
  });

  // ═══════════════════════════════════════════
  //  POINTS & REWARDS
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/portal/points
   */
  getPoints = catchAsync(async (req, res, next) => {
    const customer = await Customer.findById(req.user.id);
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    ApiResponse.success(res, {
      points: customer.gamification?.points || 0,
      totalEarned: customer.gamification?.totalEarnedPoints || 0,
      redeemed: customer.gamification?.redeemedPoints || 0,
      badges: customer.gamification?.badges || [],
      tier: customer.tier,
      stats: {
        totalPurchases: customer.financials.totalPurchases,
        totalPaid: customer.financials.totalPaid,
        onTimePayments: customer.paymentBehavior?.onTimePayments || 0,
        currentStreak: customer.paymentBehavior?.currentStreak || 0,
        longestStreak: customer.paymentBehavior?.longestStreak || 0,
        memberSince: customer.createdAt,
        firstPurchase: customer.firstPurchaseDate,
      }
    });
  });

  // ═══════════════════════════════════════════
  //  PRODUCTS & SHOPPING
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/portal/products
   */
  getProducts = catchAsync(async (req, res, next) => {
    const customer = await Customer.findById(req.user.id).populate({
      path: 'tenant',
      select: 'settings.categories'
    });
    const { page = 1, limit = 20, search, category } = req.query;

    // Get visible categories
    // Reverted implementation - no visibility check

    const filter = {
      tenant: customer.tenant._id || customer.tenant,
      isActive: true,
      stockStatus: { $ne: 'out_of_stock' }
    };

    if (category) {
      filter.category = category;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: escaped, $options: 'i' };
    }

    const [products, total, categories] = await Promise.all([
      Product.find(filter)
        .select('name description price images thumbnail category stockStatus stock.quantity')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort('-createdAt'),
      Product.countDocuments(filter),
      Product.distinct('category', { tenant: customer.tenant._id || customer.tenant, isActive: true })
    ]);

    console.log('[PORTAL_GET_PRODUCTS] Filter:', JSON.stringify(filter));
    console.log('[PORTAL_GET_PRODUCTS] Found products:', total);
    console.log('[PORTAL_GET_PRODUCTS] Found categories:', categories);

    ApiResponse.success(res, {
      products,
      categories,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  });

  /**
   * GET /api/v1/portal/products/:id
   * Get product details
   */
  getProductDetails = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const customer = await Customer.findById(req.user.id);
    const tenantId = customer.tenant._id || customer.tenant;

    const product = await Product.findOne({
      _id: id,
      tenant: tenantId,
      isActive: true
    }).select('-costPrice -supplier'); // Exclude sensitive fields

    if (!product) {
      return next(AppError.notFound('المنتج غير موجود'));
    }

    ApiResponse.success(res, product);
  });

  /**
   * POST /api/v1/portal/cart/checkout
   */
  checkout = catchAsync(async (req, res, next) => {
    const { items, shippingAddress, notes } = req.body;
    const customer = await Customer.findById(req.user.id).populate('tenant', 'settings');

    if (customer.salesBlocked) {
      return next(AppError.forbidden(`عذراً، الشراء موقوف حالياً: ${customer.salesBlockedReason || 'يرجى مراجعة الإدارة'}`));
    }

    if (!items || items.length === 0) {
      return next(AppError.badRequest('السلة فارغة'));
    }

    // Validate shipping address
    if (!shippingAddress?.phone) {
      return next(AppError.badRequest('رقم التليفون للتوصيل مطلوب'));
    }
    if (!shippingAddress?.address) {
      return next(AppError.badRequest('عنوان التوصيل مطلوب'));
    }

    let totalAmount = 0;
    const invoiceItems = [];
    const productUpdates = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, tenant: customer.tenant._id || customer.tenant, isActive: true });
      if (!product) return next(AppError.badRequest(`المنتج غير متوفر`));

      const qty = Number(item.quantity) || 1;
      if (product.stock.quantity < qty) {
        return next(AppError.badRequest(`الكمية المطلوبة من "${product.name}" غير متوفرة`));
      }

      totalAmount += product.price * qty;
      invoiceItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku || '',
        quantity: qty,
        unitPrice: product.price,
        totalPrice: product.price * qty,
      });

      productUpdates.push({ product, qty });
    }

    // Check Credit Limit
    const availableCredit = customer.financials.creditLimit - customer.financials.outstandingBalance;
    if (totalAmount > availableCredit) {
      return next(AppError.badRequest(`الرصيد المتاح (${availableCredit.toLocaleString()}) لا يكفي لإتمام الطلب (${totalAmount.toLocaleString()})`));
    }

    // Installment plan
    const installmentSettings = customer.tenant?.settings?.installments || {};
    const months = installmentSettings.defaultMonths || 6;

    const installments = [];
    const monthlyAmount = Math.ceil(totalAmount / months);
    const today = new Date();

    for (let i = 1; i <= months; i++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() + i);
      installments.push({
        installmentNumber: i,
        dueDate: date,
        amount: i === months ? totalAmount - (monthlyAmount * (months - 1)) : monthlyAmount,
        status: 'pending'
      });
    }

    // Resolve branch — use customer's branch if available (optional for portal orders)
    const branchId = customer.branch || undefined;

    const invoice = await Invoice.create({
      tenant: customer.tenant._id || customer.tenant,
      branch: branchId,
      invoiceNumber: Helpers.generateInvoiceNumber(),
      customer: customer._id,
      items: invoiceItems,
      subtotal: totalAmount,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: 'pending',
      orderStatus: 'pending',
      paymentMethod: 'deferred',
      installments,
      createdBy: customer._id, // portal order — customer is the originator
      source: 'portal',
      shippingAddress: {
        fullName: shippingAddress.fullName || customer.name,
        phone: shippingAddress.phone,
        address: shippingAddress.address,
        city: shippingAddress.city || '',
        governorate: shippingAddress.governorate || '',
        notes: shippingAddress.notes || '',
      },
      notes: notes || 'طلب من خلال بوابة العملاء',
      orderStatusHistory: [{ status: 'pending', note: 'تم استلام الطلب من البوابة الإلكترونية' }],
    });

    // Update Stock
    for (const update of productUpdates) {
      await Product.findByIdAndUpdate(update.product._id, { $inc: { 'stock.quantity': -update.qty } });
    }

    // Update Customer Balance
    if (typeof customer.recordPurchase === 'function') {
      customer.recordPurchase(totalAmount);
    } else {
      customer.financials.totalPurchases += totalAmount;
      customer.financials.outstandingBalance += totalAmount;
    }
    await customer.save();

    // Notify Admin
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        tenant: customer.tenant._id || customer.tenant,
        type: 'order',
        title: 'طلب جديد من البوابة',
        message: `طلب جديد رقم #${invoice.invoiceNumber} بقيمة ${totalAmount.toLocaleString()} من العميل ${customer.name}`,
        data: {
          invoiceId: invoice._id,
          customerId: customer._id,
          actionUrl: `/invoices/${invoice._id}`
        }
      });
    } catch (e) {
      // Don't fail the order if notification fails
    }

    // Create customer notification for order confirmation
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        tenant: customer.tenant._id || customer.tenant,
        customerRecipient: customer._id,
        type: 'order',
        title: 'تم استلام طلبك',
        message: `طلبك رقم #${invoice.invoiceNumber} بقيمة ${totalAmount.toLocaleString()} ج.م قيد المراجعة`,
        icon: 'shopping-bag',
        color: 'success',
      });
    } catch (e) { /* ignore */ }

    ApiResponse.created(res, {
      orderId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount,
      installments: installments.length,
      monthlyAmount,
    }, 'تم استلام طلبك بنجاح');
  });

  // ═══════════════════════════════════════════
  //  PDF DOWNLOADS
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/portal/invoices/:id/pdf
   */
  downloadInvoicePDF = catchAsync(async (req, res, next) => {
    const customerId = req.user.id;
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      customer: customerId
    }).populate('items.product', 'name').populate('customer', 'name phone');

    if (!invoice) {
      return next(AppError.notFound('الفاتورة غير موجودة'));
    }

    const customer = await Customer.findById(customerId).populate('tenant', 'name');
    const PDFService = require('../services/PDFService');

    const result = await PDFService.generateInvoicePDF(invoice, customer.tenant);
    if (!result.success) {
      return next(AppError.internal('فشل إنشاء ملف PDF'));
    }

    const fs = require('fs');
    res.download(result.filepath, `invoice_${invoice.invoiceNumber}.pdf`, () => {
      try { fs.unlinkSync(result.filepath); } catch (e) { /* ignore */ }
    });
  });

  /**
   * GET /api/v1/portal/statement/pdf
   */
  downloadStatementPDF = catchAsync(async (req, res, next) => {
    const customerId = req.user.id;
    const { startDate, endDate } = req.query;

    const customer = await Customer.findById(customerId).populate('tenant', 'name');
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const invoiceFilter = { customer: customerId };
    if (Object.keys(dateFilter).length > 0) {
      invoiceFilter.createdAt = dateFilter;
    }

    const invoices = await Invoice.find(invoiceFilter)
      .populate('items.product', 'name')
      .sort('createdAt');

    const PDFService = require('../services/PDFService');
    const result = await PDFService.generateCustomerStatement(
      customer,
      invoices,
      customer.tenant?.name || 'PayQusta',
      { startDate, endDate }
    );

    if (!result.success) {
      return next(AppError.internal('فشل إنشاء ملف PDF'));
    }

    const fs = require('fs');
    res.download(result.filepath, `statement_${customer.name}.pdf`, () => {
      try { fs.unlinkSync(result.filepath); } catch (e) { /* ignore */ }
    });
  });

  // ═══════════════════════════════════════════
  //  NOTIFICATIONS
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/portal/notifications
   */
  getNotifications = catchAsync(async (req, res, next) => {
    const customerId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const Notification = require('../models/Notification');
    const customer = await Customer.findById(customerId);

    const filter = { tenant: customer.tenant, customerRecipient: customerId };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false })
    ]);

    ApiResponse.success(res, {
      notifications,
      unreadCount,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  });

  /**
   * GET /api/v1/portal/notifications/unread-count
   */
  getUnreadCount = catchAsync(async (req, res, next) => {
    const Notification = require('../models/Notification');
    const customer = await Customer.findById(req.user.id);
    const count = await Notification.countDocuments({
      tenant: customer.tenant,
      customerRecipient: req.user.id,
      isRead: false
    });
    ApiResponse.success(res, { count });
  });

  /**
   * PUT /api/v1/portal/notifications/:id/read
   */
  markNotificationRead = catchAsync(async (req, res, next) => {
    const Notification = require('../models/Notification');
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, customerRecipient: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notif) return next(AppError.notFound('الإشعار غير موجود'));
    ApiResponse.success(res, notif);
  });

  /**
   * PUT /api/v1/portal/notifications/read-all
   */
  markAllNotificationsRead = catchAsync(async (req, res, next) => {
    const Notification = require('../models/Notification');
    const customer = await Customer.findById(req.user.id);
    await Notification.updateMany(
      { tenant: customer.tenant, customerRecipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    ApiResponse.success(res, null, 'تم تعليم جميع الإشعارات كمقروءة');
  });

  // ═══════════════════════════════════════════
  //  ORDER TRACKING
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/portal/orders
   */
  getOrders = catchAsync(async (req, res, next) => {
    const customerId = req.user.id;
    const { page = 1, limit = 15, status } = req.query;

    const filter = { customer: customerId };
    if (status && status !== 'all') filter.orderStatus = status;

    const [orders, total] = await Promise.all([
      Invoice.find(filter)
        .select('invoiceNumber totalAmount paidAmount remainingAmount status orderStatus paymentMethod createdAt items orderStatusHistory')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('items.product', 'name images thumbnail'),
      Invoice.countDocuments(filter)
    ]);

    ApiResponse.success(res, {
      orders,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  });

  /**
   * GET /api/v1/portal/orders/:id
   */
  getOrderDetails = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      customer: req.user.id
    }).populate('items.product', 'name images thumbnail price');

    if (!invoice) return next(AppError.notFound('الطلب غير موجود'));
    ApiResponse.success(res, invoice);
  });

  // ═══════════════════════════════════════════
  //  WISHLIST
  // ═══════════════════════════════════════════

  /**
   * POST /api/v1/portal/wishlist/:productId
   */
  toggleWishlist = catchAsync(async (req, res, next) => {
    const customer = await Customer.findById(req.user.id);
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    const productId = req.params.productId;
    const product = await Product.findOne({
      _id: productId,
      tenant: customer.tenant,
      isActive: true
    });
    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    const wishlist = customer.wishlist || [];
    const idx = wishlist.findIndex(id => id.toString() === productId);

    if (idx > -1) {
      customer.wishlist.splice(idx, 1);
      await customer.save({ validateBeforeSave: false });
      ApiResponse.success(res, { wishlisted: false }, 'تم الإزالة من المفضلة');
    } else {
      if (!customer.wishlist) customer.wishlist = [];
      customer.wishlist.push(productId);
      await customer.save({ validateBeforeSave: false });
      ApiResponse.success(res, { wishlisted: true }, 'تمت الإضافة للمفضلة');
    }
  });

  /**
   * GET /api/v1/portal/wishlist
   */
  getWishlist = catchAsync(async (req, res, next) => {
    const customer = await Customer.findById(req.user.id).populate({
      path: 'wishlist',
      select: 'name price images thumbnail category stockStatus stock.quantity',
      match: { isActive: true }
    });
    if (!customer) return next(AppError.notFound('العميل غير موجود'));
    ApiResponse.success(res, { products: (customer.wishlist || []).filter(Boolean) });
  });

  // ═══════════════════════════════════════════
  //  SUPPORT / CONTACT
  // ═══════════════════════════════════════════

  /**
   * POST /api/v1/portal/support
   */
  sendSupportMessage = catchAsync(async (req, res, next) => {
    const { subject, message, type } = req.body;
    if (!subject || !message) {
      return next(AppError.badRequest('الموضوع والرسالة مطلوبين'));
    }

    const customer = await Customer.findById(req.user.id).populate('tenant', 'name businessInfo');
    const Notification = require('../models/Notification');
    const User = require('../models/User');
    const SupportMessage = require('../models/SupportMessage');

    // Save support message to database
    const supportMsg = await SupportMessage.create({
      tenant: customer.tenant._id,
      customer: customer._id,
      subject,
      message,
      type: type || 'inquiry',
    });

    // Notify vendor/admin
    const admins = await User.find({
      tenant: customer.tenant._id,
      role: { $in: ['admin', 'vendor'] }
    }).select('_id');

    for (const admin of admins) {
      await Notification.create({
        tenant: customer.tenant._id,
        recipient: admin._id,
        type: 'system',
        title: `رسالة دعم من ${customer.name}`,
        message: `[${type || 'استفسار'}] ${subject}: ${message.substring(0, 200)}`,
        icon: 'message-circle',
        color: 'primary',
        link: '/support-messages',
        relatedId: supportMsg._id,
      });
    }

    // Confirmation notification for customer
    await Notification.create({
      tenant: customer.tenant._id,
      customerRecipient: customer._id,
      type: 'support_reply',
      title: 'تم إرسال رسالتك',
      message: `تم إرسال رسالتك "${subject}" للمتجر. سيتم التواصل معك قريباً.`,
      icon: 'check-circle',
      color: 'success',
    });

    ApiResponse.success(res, {
      ticketId: supportMsg._id,
      storeContact: {
        phone: customer.tenant?.businessInfo?.phone,
        email: customer.tenant?.businessInfo?.email,
      }
    }, 'تم إرسال رسالتك بنجاح. سيتم التواصل معك قريباً');
  });

  // ═══════════════════════════════════════════
  //  REORDER
  // ═══════════════════════════════════════════

  /**
   * POST /api/v1/portal/orders/:id/reorder
   */
  reorder = catchAsync(async (req, res, next) => {
    const customerId = req.user.id;
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      customer: customerId
    }).populate('items.product', 'name price images isActive stock.quantity');

    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    const reorderItems = [];
    for (const item of invoice.items) {
      if (item.product && item.product.isActive && item.product.stock?.quantity >= 1) {
        reorderItems.push({
          product: {
            _id: item.product._id,
            name: item.product.name,
            price: item.product.price,
            images: item.product.images,
          },
          quantity: Math.min(item.quantity, item.product.stock.quantity),
          price: item.product.price,
          cartKey: item.product._id.toString(),
        });
      }
    }

    if (reorderItems.length === 0) {
      return next(AppError.badRequest('لا توجد منتجات متاحة لإعادة الطلب'));
    }

    ApiResponse.success(res, { items: reorderItems }, `تمت إضافة ${reorderItems.length} منتج للسلة`);
  });

  // ═══════════════════════════════════════════
  //  POINTS HISTORY
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/portal/points/history
   */
  getPointsHistory = catchAsync(async (req, res, next) => {
    const customer = await Customer.findById(req.user.id);
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    const invoices = await Invoice.find({ customer: req.user.id })
      .select('invoiceNumber totalAmount paidAmount createdAt status payments')
      .sort('-createdAt')
      .limit(50);

    const history = [];

    invoices.forEach(inv => {
      const purchasePoints = Math.floor(inv.totalAmount / 1000) * 10;
      if (purchasePoints > 0) {
        history.push({
          date: inv.createdAt,
          type: 'earned',
          points: purchasePoints,
          description: `نقاط شراء - فاتورة #${inv.invoiceNumber}`,
        });
      }

      (inv.payments || []).forEach(payment => {
        history.push({
          date: payment.date,
          type: 'earned',
          points: 5,
          description: `نقاط سداد - فاتورة #${inv.invoiceNumber}`,
        });
      });
    });

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    ApiResponse.success(res, {
      currentPoints: customer.gamification?.points || 0,
      totalEarned: customer.gamification?.totalEarnedPoints || 0,
      redeemed: customer.gamification?.redeemedPoints || 0,
      history,
    });
  });

  /**
   * POST /api/v1/portal/invoices/:id/pay
   * Pay invoice (full or partial payment)
   */
  payInvoice = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { amount, paymentMethod, notes } = req.body;
    const customer = await Customer.findById(req.customer._id);

    if (!amount || amount <= 0) {
      return next(AppError.badRequest('يرجى إدخال مبلغ الدفع'));
    }

    // Get invoice
    const invoice = await Invoice.findOne({
      _id: id,
      customer: customer._id,
      tenant: customer.tenant
    });

    if (!invoice) {
      return next(AppError.notFound('الفاتورة غير موجودة'));
    }

    // Check if invoice is already fully paid
    if (invoice.status === 'paid' || invoice.paid >= invoice.total) {
      return next(AppError.badRequest('هذه الفاتورة مدفوعة بالكامل'));
    }

    const remaining = invoice.total - invoice.paid;

    // Validate amount
    if (amount > remaining) {
      return next(AppError.badRequest(`المبلغ أكبر من المبلغ المتبقي (${remaining.toFixed(2)} ج.م)`));
    }

    // Update invoice paid amount
    invoice.paid += amount;

    // Add payment to history
    if (!invoice.payments) invoice.payments = [];
    invoice.payments.push({
      amount,
      paymentMethod: paymentMethod || 'online',
      paidAt: new Date(),
      notes: notes || 'دفع من بوابة العملاء',
      paidBy: customer.name
    });

    // Check if fully paid
    if (invoice.paid >= invoice.total) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
    } else {
      invoice.status = 'partial';
    }

    await invoice.save();

    // Update customer outstanding balance
    customer.outstanding = customer.outstanding - amount;
    await customer.save();

    // Create notification for vendor
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: invoice.createdBy, // Assuming createdBy is the vendor user
      type: 'payment',
      title: 'دفعة جديدة',
      message: `قام العميل ${customer.name} بدفع ${amount.toFixed(2)} ج.م من فاتورة ${invoice.invoiceNumber}`,
      link: `/invoices/${invoice._id}`,
      tenant: customer.tenant
    });

    ApiResponse.success(res, {
      invoice,
      paid: amount,
      remaining: invoice.total - invoice.paid,
      status: invoice.status
    }, 'تم الدفع بنجاح');
  });
}

module.exports = new PortalController();
