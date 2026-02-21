/**
 * Middleware to check subscription limits
 */
const Tenant = require('../models/Tenant');
const Product = require('../models/Product');
const User = require('../models/User');
const Branch = require('../models/Branch');
const PLANS = require('../config/plans');
const AppError = require('../utils/AppError');

const checkLimit = (resource) => {
  return async (req, res, next) => {
    try {
      // 1. Get current tenant and plan
      // For 'store' creation, we check the User's owned tenants count (if we implement multi-tenant users later)
      // For now, let's assume req.tenantId is set for Product/User creation.
      
      let planId = 'free';
      let currentUsage = 0;
      let limit = 0;

      // Special handling for creating a NEW Store (Branch)
      if (resource === 'store') {
        if (!req.tenantId) return next();
        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

        const planId = tenant.subscription?.plan || 'free';
        const plan = PLANS[planId];
        if (!plan) return next();

        const storeLimit = plan.limits.stores;
        const currentBranches = await Branch.countDocuments({ tenant: req.tenantId, isActive: true });

        if (currentBranches >= storeLimit) {
          return next(AppError.forbidden(
            `لقد وصلت للحد الأقصى من الفروع المسموح به في باقتك (${storeLimit}). يرجى ترقية الباقة لإضافة المزيد.`
          ));
        }
        return next();
      }

      // Check existence of tenant
      if (!req.tenantId) {
         // If no tenant context (shouldn't happen for protected routes), skip or error
         return next();
      }

      const tenant = await Tenant.findById(req.tenantId);
      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      planId = tenant.subscription?.plan || 'free';
      const plan = PLANS[planId];
      if (!plan) return next(AppError.badRequest('خطة اشتراك غير صالحة'));

      // 2. Count current usage based on resource
      switch (resource) {
        case 'product':
          limit = plan.limits.products;
          currentUsage = await Product.countDocuments({ tenant: req.tenantId, isActive: true });
          break;
        case 'user':
          limit = plan.limits.users;
          currentUsage = await User.countDocuments({ tenant: req.tenantId, isActive: true });
          break;
        // case 'invoice':
          // could check monthly invoice count here
          // break;
        default:
          return next();
      }

      // 3. Compare
      if (currentUsage >= limit) {
        return next(AppError.forbidden(
          `عفواً، لقد وصلت للحد الأقصى من ${resource === 'product' ? 'المنتجات' : 'المستخدمين'} المسموح به في باقتك (${limit}). يرجى ترقية الباقة لإضافة المزيد.`
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = checkLimit;
