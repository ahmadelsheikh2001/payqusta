/**
 * Tenant Controller — Multi-Branch Management
 */

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const PLANS = require('../config/plans');
const NotificationService = require('../services/NotificationService');
const jwt = require('jsonwebtoken'); // used in switchTenant
const catchAsync = require('../utils/catchAsync');

class TenantController {
  
  /**
   * Create a new branch (Store) for the current user
   * POST /api/v1/tenants/branch
   */
  createBranch = catchAsync(async (req, res, next) => {
    const { name, phone, address } = req.body;
    const userId = req.user._id;

    // 1. Check Plan Limits (Stores)
    const currentTenant = await Tenant.findById(req.tenantId);
    if (!currentTenant) return next(AppError.notFound('المتجر الحالي غير موجود'));

    const planId = currentTenant.subscription?.plan || 'free';
    const plan = PLANS[planId];
    const storeLimit = plan.limits.stores;

    // Count stores owned by this user
    const ownedStoresCount = await Tenant.countDocuments({ owner: userId, isActive: true });

    if (ownedStoresCount >= storeLimit) {
      return next(AppError.forbidden(
        `عفواً، لقد وصلت للحد الأقصى من الفروع المسموح به في باقتك (${storeLimit}). يرجى ترقية الباقة لإضافة فروع جديدة.`
      ));
    }

    // 2. Create the new Tenant (Branch)
    const newTenant = await Tenant.create({
      name,
      slug: name.toLowerCase().replace(/[^\w\u0621-\u064A\s-]/g, '').replace(/\s+/g, '-'),
      owner: userId,
      businessInfo: { phone, address },
      subscription: {
        plan: planId === 'enterprise' ? 'enterprise' : 'free',
        status: 'active'
      }
    });

    // 3. Add new tenant to User's tenants array
    await User.findByIdAndUpdate(userId, {
      $addToSet: { tenants: newTenant._id }
    });

    // Send Notification
    NotificationService.onBranchCreated(req.tenantId, newTenant.name, req.user.name).catch(() => {});

    ApiResponse.created(res, newTenant, 'تم إنشاء الفرع بنجاح');
  });

  /**
   * Get all branches accessible by the current user
   * GET /api/v1/tenants/my-branches
   */
  getMyBranches = catchAsync(async (req, res, next) => {
    // Find tenants where user is owner OR user is in the tenant (if we had a users list in Tenant, but we have tenant in User)
    // Actually, User.tenants has the list.
    const user = await User.findById(req.user._id).populate('tenants', 'name slug businessInfo subscription isActive');
    
    // Also include the 'legacy' single tenant if not in the array
    let branches = user.tenants || [];
    
    // If the main tenant isn't in the list (legacy data), add it
     const mainTenantId = user.tenant;
     if (mainTenantId && !branches.find(b => b._id.toString() === mainTenantId.toString())) {
       const mainTenant = await Tenant.findById(mainTenantId).select('name slug businessInfo subscription isActive');
       if (mainTenant) branches.push(mainTenant);
     }

    ApiResponse.success(res, branches, 'قائمة الفروع');
  });

  /**
   * Switch Tenant Session
   * POST /api/v1/auth/switch-tenant
   * This actually just returns a new Token for the target tenant
   */
  switchTenant = catchAsync(async (req, res, next) => {
    const { tenantId } = req.body;
    const user = req.user;

    // Verify user has access to this tenant
    // Check if user.tenants includes this id OR user.tenant == id
    const isOwner = await Tenant.exists({ _id: tenantId, owner: user._id });
    const legacyAccess = user.tenant.toString() === tenantId;
    const arrayAccess = user.tenants?.some(t => t.toString() === tenantId);

    if (!isOwner && !legacyAccess && !arrayAccess && user.role !== 'admin') {
       return next(AppError.forbidden('ليس لديك صلاحية الوصول لهذا الفرع'));
    }

    // Generate new token with new tenantId
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        tenant: tenantId, // The new tenant
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    ApiResponse.success(res, { token }, 'تم التحويل للفرع المحدد');
  });
}

module.exports = new TenantController();
