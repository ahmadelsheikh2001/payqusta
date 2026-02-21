/**
 * Authentication & Authorization Middleware
 * JWT verification, role-based access control, tenant isolation
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Protect routes — verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header OR query string (for SSE)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return next(AppError.unauthorized('يرجى تسجيل الدخول للوصول'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return next(AppError.unauthorized('المستخدم غير موجود'));
    }

    if (!user.isActive) {
      return next(AppError.unauthorized('تم تعطيل هذا الحساب'));
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return next(AppError.unauthorized('تم تغيير كلمة المرور. يرجى تسجيل الدخول مرة أخرى'));
    }

    // Check session version (logout from all devices)
    const tokenSv = decoded.sv || 0;
    if (tokenSv !== (user.sessionVersion || 0)) {
      return next(AppError.unauthorized('تم إنهاء جلستك. يرجى تسجيل الدخول مرة أخرى'));
    }

    // Attach user and tenant to request
    req.user = user;
    req.tenantId = decoded.tenant || user.tenant;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(AppError.unauthorized('رمز المصادقة غير صالح'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('انتهت صلاحية رمز المصادقة'));
    }
    next(error);
  }
};

/**
 * Authorize specific roles
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`الدور "${req.user.role}" غير مصرح له بالوصول`)
      );
    }
    next();
  };
};

/**
 * Tenant isolation middleware
 * Ensures all queries are scoped to the current tenant
 */
const tenantScope = (req, res, next) => {
  if (!req.tenantId && req.user && req.user.role !== 'admin') {
    return next(AppError.badRequest('معرف المتجر مطلوب'));
  }

  // Attach tenant filter helper
  // Admin with a tenant gets scoped too; admin without tenant gets global access ONLY if explicitly designed (e.g. Super Admin)
  // But here 'admin' usually means Tenant Admin. Super Admin has verifySuperAdmin or isSuperAdmin flag.
  // We must ensure that if a user has a tenant, they are scoped to it, regardless of role 'admin'.

  if (req.user && req.user.tenant && !req.user.isSuperAdmin) {
    req.tenantId = req.user.tenant.toString();
    req.tenantFilter = { tenant: req.tenantId };
  } else {
    req.tenantFilter = req.tenantId ? { tenant: req.tenantId } : {};
  }

  next();
};

/**
 * Public Tenant Scope middleware
 * For storefront routes that don't require authentication
 */
const publicTenantScope = async (req, res, next) => {
  try {
    // If already has tenantId (e.g. from protect), move on
    if (req.tenantId) {
      req.tenantFilter = { tenant: req.tenantId };
      return next();
    }

    // Try to get tenant from header, query or slug
    const tenantId = req.headers['x-tenant-id'] || req.query.tenant;
    const slug = req.query.slug || req.headers['x-tenant-slug'];

    if (!tenantId && !slug) {
      return next(AppError.badRequest('يرجى تحديد المتجر (x-tenant-id أو slug)'));
    }

    const Tenant = require('../models/Tenant');
    let tenant;
    if (tenantId) {
      tenant = await Tenant.findById(tenantId);
    } else {
      tenant = await Tenant.findOne({ slug });
    }

    if (!tenant) {
      return next(AppError.notFound('المتجر غير موجود'));
    }

    req.tenantId = tenant._id;
    req.tenantFilter = { tenant: tenant._id };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Audit logging middleware
 * Logs sensitive operations
 */
const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Log after successful response
      if (data.success) {
        const AuditLog = require('../models/AuditLog');
        AuditLog.log({
          tenant: req.tenantId,
          user: req.user?._id,
          action,
          resource,
          resourceId: req.params.id || data.data?._id,
          details: { method: req.method, path: req.path },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        }).catch((err) => logger.error(`Audit log error: ${err.message}`));
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = { protect, authorize, tenantScope, publicTenantScope, auditLog };
