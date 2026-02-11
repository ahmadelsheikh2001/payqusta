/**
 * Admin Controller — Super Admin Dashboard
 * Manage tenants, users, system statistics
 * Only accessible by role='admin'
 */

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');

class AdminController {
  /**
   * GET /api/v1/admin/dashboard
   * System overview statistics
   */
  async getDashboard(req, res, next) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/tenants
   * Get all tenants with pagination
   */
  async getTenants(req, res, next) {
    try {
      const { page, limit, skip } = Helpers.getPaginationParams(req.query);
      const filter = {};

      if (req.query.search) {
        filter.name = { $regex: req.query.search, $options: 'i' };
      }
      if (req.query.status) {
        filter.isActive = req.query.status === 'active';
      }

      const [tenants, total] = await Promise.all([
        Tenant.find(filter)
          .populate('owner', 'name email phone')
          .sort('-createdAt')
          .skip(skip)
          .limit(limit)
          .lean(),
        Tenant.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, tenants, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/tenants
   * Create new tenant
   */
  async createTenant(req, res, next) {
    try {
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
          plan: plan || 'free',
          status: 'trial',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      // Create owner user
      const owner = await User.create({
        name: ownerName,
        email: ownerEmail,
        phone: ownerPhone,
        password: ownerPassword || '123456',
        role: 'vendor',
        tenant: tenant._id,
      });

      tenant.owner = owner._id;
      await tenant.save();

      ApiResponse.created(res, { tenant, owner }, 'تم إنشاء المتجر بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/tenants/:id
   * Update tenant
   */
  async updateTenant(req, res, next) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/tenants/:id
   * Delete tenant (soft delete - set isActive to false)
   */
  async deleteTenant(req, res, next) {
    try {
      const tenant = await Tenant.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      // Also deactivate all users in this tenant
      await User.updateMany({ tenant: tenant._id }, { isActive: false });

      ApiResponse.success(res, null, 'تم تعطيل المتجر وجميع المستخدمين');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/users
   * Get all users across all tenants
   */
  async getUsers(req, res, next) {
    try {
      const { page, limit, skip } = Helpers.getPaginationParams(req.query);
      const filter = {};

      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ];
      }
      if (req.query.role) filter.role = req.query.role;
      if (req.query.tenant) filter.tenant = req.query.tenant;

      const [users, total] = await Promise.all([
        User.find(filter)
          .populate('tenant', 'name slug')
          .sort('-createdAt')
          .skip(skip)
          .limit(limit)
          .select('-password')
          .lean(),
        User.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, users, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/users
   * Create user in any tenant
   */
  async createUser(req, res, next) {
    try {
      const { name, email, phone, password, role, tenantId } = req.body;

      // Validate role
      if (!['vendor', 'coordinator'].includes(role)) {
        return next(AppError.badRequest('الدور يجب أن يكون vendor أو coordinator'));
      }

      // Check if tenant exists
      if (tenantId) {
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) return next(AppError.notFound('المتجر غير موجود'));
      }

      // Check if email already exists in this tenant
      const existing = await User.findOne({ email, tenant: tenantId });
      if (existing) {
        return next(AppError.badRequest('البريد الإلكتروني مستخدم بالفعل في هذا المتجر'));
      }

      const user = await User.create({
        name,
        email,
        phone,
        password: password || '123456',
        role,
        tenant: tenantId,
      });

      ApiResponse.created(res, user, 'تم إنشاء المستخدم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/users/:id
   * Update user
   */
  async updateUser(req, res, next) {
    try {
      const allowedFields = ['name', 'email', 'phone', 'role', 'isActive'];
      const updateData = {};
      allowedFields.forEach((f) => {
        if (req.body[f] !== undefined) updateData[f] = req.body[f];
      });

      const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('tenant', 'name');

      if (!user) return next(AppError.notFound('المستخدم غير موجود'));

      ApiResponse.success(res, user, 'تم تحديث المستخدم');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/users/:id
   * Delete user (soft delete)
   */
  async deleteUser(req, res, next) {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!user) return next(AppError.notFound('المستخدم غير موجود'));

      ApiResponse.success(res, null, 'تم تعطيل المستخدم');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/audit-logs
   * View system audit logs
   */
  async getAuditLogs(req, res, next) {
    try {
      const { page, limit, skip } = Helpers.getPaginationParams(req.query);
      const filter = {};

      if (req.query.action) filter.action = req.query.action;
      if (req.query.resource) filter.resource = req.query.resource;
      if (req.query.tenant) filter.tenant = req.query.tenant;

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
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/statistics
   * Advanced system statistics
   */
  async getStatistics(req, res, next) {
    try {
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
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
