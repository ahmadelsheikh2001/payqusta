/**
 * Admin Controller — Super Admin Dashboard
 * Manage tenants, users, system statistics
 * Only accessible by role='admin'
 */

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const catchAsync = require('../utils/catchAsync');

class AdminController {
  /**
   * GET /api/v1/admin/dashboard
   * System overview statistics
   */
  getDashboard = catchAsync(async (req, res, next) => {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalInvoices,
      totalCustomers,
      totalProducts,
      recentTenants,
      recentUsers,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ isActive: true }),
      User.countDocuments(),
      Invoice.countDocuments(),
      Customer.countDocuments(),
      Product.countDocuments(),
      Tenant.find().sort('-createdAt').limit(5).select('name slug subscription createdAt'),
      User.find().sort('-createdAt').limit(10).populate('tenant', 'name').select('name email role tenant createdAt'),
    ]);

    // Calculate total revenue (sum of all invoices)
    const revenueStats = await Invoice.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$remainingAmount' },
        },
      },
    ]);

    const revenue = revenueStats[0] || { totalRevenue: 0, totalPaid: 0, totalOutstanding: 0 };

    ApiResponse.success(res, {
      statistics: {
        tenants: { total: totalTenants, active: activeTenants },
        users: { total: totalUsers },
        invoices: { total: totalInvoices },
        customers: { total: totalCustomers },
        products: { total: totalProducts },
        revenue,
      },
      recentTenants,
      recentUsers,
    }, 'لوحة تحكم المدير');
  });

  /**
   * GET /api/v1/admin/tenants
   * Get all tenants with pagination
   */
  getTenants = catchAsync(async (req, res, next) => {
    const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);
    
    const filter = { isActive: true };
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { 'businessInfo.email': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(filter)
        .populate('owner', 'name email phone role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Tenant.countDocuments(filter)
    ]);

    // Add branches to each tenant
    const tenantsWithBranches = await Promise.all(
      tenants.map(async (tenant) => {
        const branches = await Branch.find({ tenant: tenant._id, isActive: true })
          .select('name address phone managerName type isActive createdAt')
          .lean();
        return {
          ...tenant,
          branches
        };
      })
    );

    ApiResponse.paginated(res, tenantsWithBranches, { page, limit, total });
  });

  /**
   * POST /api/v1/admin/tenants
   * Create new tenant
   */
  createTenant = catchAsync(async (req, res, next) => {
    const { name, ownerName, ownerEmail, ownerPhone, ownerPassword, plan } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email: ownerEmail });
    if (existingUser) {
      return next(AppError.badRequest('البريد الإلكتروني مستخدم بالفعل'));
    }

    // Create tenant
    const tenant = await Tenant.create({
      name,
      slug: name.toLowerCase().replace(/[^\w\u0621-\u064A\s-]/g, '').replace(/\s+/g, '-'),
      subscription: {
        plan: plan || 'enterprise', // Default to enterprise for full permissions
        status: 'active', // Active immediately
        maxProducts: 10000,
        maxCustomers: 10000,
        maxUsers: 50,
        trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
      settings: {
        categories: ['عام', 'ملابس', 'إلكترونيات', 'مشروبات', 'مأكولات'], // Default categories
      }
    });

    // Create owner user
    const owner = await User.create({
      name: ownerName,
      email: ownerEmail,
      phone: ownerPhone,
      password: ownerPassword || '123456',
      role: 'admin', // Tenant Admin/Owner
      tenant: tenant._id,
      isSuperAdmin: false,
    });

    tenant.owner = owner._id;
    await tenant.save();

    ApiResponse.created(res, { tenant, owner }, 'تم إنشاء المتجر بنجاح');
  });

  /**
   * PUT /api/v1/admin/tenants/:id
   * Update tenant
   */
  updateTenant = catchAsync(async (req, res, next) => {
    const allowedFields = ['name', 'isActive', 'subscription'];
    const updateData = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    });

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'name email');

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    ApiResponse.success(res, tenant, 'تم تحديث المتجر');
  });

  /**
   * DELETE /api/v1/admin/tenants/:id
   * Delete tenant (soft delete - set isActive to false)
   */
  deleteTenant = catchAsync(async (req, res, next) => {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    // Also deactivate all users in this tenant
    await User.updateMany({ tenant: tenant._id }, { isActive: false });

    ApiResponse.success(res, null, 'تم تعطيل المتجر وجميع المستخدمين');
  });

  /**
   * POST /api/v1/admin/tenants/:id/reset-password
   * Reset tenant owner password
   */
  resetTenantPassword = catchAsync(async (req, res, next) => {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return next(AppError.badRequest('كلمة المرور يجب أن تكون 6 أحرف على الأقل'));
    }

    const tenant = await Tenant.findById(req.params.id);
    if (!tenant || !tenant.owner) return next(AppError.notFound('المتجر أو المالك غير موجود'));

    const owner = await User.findById(tenant.owner);
    if (!owner) return next(AppError.notFound('حساب المالك غير موجود'));

    owner.password = password;
    await owner.save();

    ApiResponse.success(res, { email: owner.email, password }, 'تم إعادة تعيين كلمة المرور بنجاح');
  });

  /**
   * GET /api/v1/admin/users
   * Get all users across all tenants
   */
  getUsers = catchAsync(async (req, res, next) => {
    const { page, limit, skip } = Helpers.getPaginationParams(req.query);
    const filter = {};

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.role) filter.role = req.query.role;
    
    // Filter by tenant (force if not super admin)
    if (req.user.isSuperAdmin) {
      if (req.query.tenant) filter.tenant = req.query.tenant;
    } else {
      filter.tenant = req.user.tenant;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('tenant', 'name slug')
        .populate('branch', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .select('-password')
        .lean(),
      User.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, users, { page, limit, total });
  });

  /**
   * POST /api/v1/admin/users
   * Create user in any tenant
   */
  createUser = catchAsync(async (req, res, next) => {
    const { name, email, phone, password, role, tenantId, branch } = req.body;

    // Validate role
    if (!['vendor', 'coordinator'].includes(role)) {
      return next(AppError.badRequest('الدور يجب أن يكون vendor أو coordinator'));
    }

    // Ensure tenantId is correct for non-super admins
    const targetTenantId = req.user.isSuperAdmin ? tenantId : req.user.tenant;

    // Check if tenant exists (only if tenantId is provided or forced)
    if (targetTenantId) {
      const tenant = await Tenant.findById(targetTenantId);
      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return next(AppError.badRequest('البريد الإلكتروني مستخدم بالفعل'));
    }

    const user = await User.create({
      name,
      email,
      phone,
      password: password || '123456',
      role,
      tenant: targetTenantId,
      branch,
    });

    ApiResponse.created(res, user, 'تم إنشاء المستخدم بنجاح');
  });

  /**
   * PUT /api/v1/admin/users/:id
   * Update user
   */
  updateUser = catchAsync(async (req, res, next) => {
    const allowedFields = ['name', 'email', 'phone', 'role', 'isActive', 'branch'];
    const updateData = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    });

    const query = { _id: req.params.id };
    if (!req.user.isSuperAdmin) {
      query.tenant = req.user.tenant;
    }

    const user = await User.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('tenant', 'name');

    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    ApiResponse.success(res, user, 'تم تحديث المستخدم');
  });

  /**
   * DELETE /api/v1/admin/users/:id
   * Delete user (soft delete)
   */
  deleteUser = catchAsync(async (req, res, next) => {
    const query = { _id: req.params.id };
    if (!req.user.isSuperAdmin) {
      query.tenant = req.user.tenant;
    }

    const user = await User.findOneAndUpdate(
      query,
      { isActive: false },
      { new: true }
    );

    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    ApiResponse.success(res, null, 'تم تعطيل المستخدم');
  });

  /**
   * GET /api/v1/admin/audit-logs
   * View system audit logs
   */
  getAuditLogs = catchAsync(async (req, res, next) => {
    const { page, limit, skip } = Helpers.getPaginationParams(req.query);
    const filter = {};

    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      
      // Find users matching search first
      const users = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');
      
      const userIds = users.map(u => u._id);

      filter.$or = [
        { user: { $in: userIds } },
        { action: searchRegex },
        { resource: searchRegex },
        { ipAddress: searchRegex },
        { description: searchRegex }
      ];
    }

    if (req.query.action) filter.action = req.query.action;
    if (req.query.resource) filter.resource = req.query.resource;
    
    // Filter by tenant (force if not super admin)
    if (req.user.isSuperAdmin) {
      if (req.query.tenant) filter.tenant = req.query.tenant;
    } else {
      filter.tenant = req.user.tenant;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'name email')
        .populate('tenant', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, logs, { page, limit, total });
  });

  /**
   * GET /api/v1/admin/statistics
   * Advanced system statistics
   */
  getStatistics = catchAsync(async (req, res, next) => {
    // Get statistics by tenant
    const tenantStats = await Invoice.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$tenant',
          totalSales: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 },
    ]);

    // Populate tenant names
    await Tenant.populate(tenantStats, { path: '_id', select: 'name slug' });

    // User distribution by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    // Subscription distribution
    const subscriptionStats = await Tenant.aggregate([
      { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
    ]);

    ApiResponse.success(res, {
      topTenants: tenantStats,
      usersByRole,
      subscriptionStats,
    }, 'إحصائيات النظام');
  });
}

module.exports = new AdminController();
