/**
 * Auth Controller — Registration, Login, Token Management
 * Handles vendor registration (creates tenant + user)
 */

const User = require('../models/User');
const Tenant = require('../models/Tenant');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');
const crypto = require('crypto');
const emailService = require('../services/EmailService');
const catchAsync = require('../utils/catchAsync');
const { getUserPermissions } = require('../middleware/checkPermission');

class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register a new vendor (creates Tenant + User)
   */
  register = catchAsync(async (req, res, next) => {
    const { name, email, phone, password, storeName, storePhone, storeAddress } = req.body;

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(AppError.conflict('البريد الإلكتروني مسجل بالفعل'));
    }

    // Create Tenant first
    const tenant = await Tenant.create({
      name: storeName || `متجر ${name}`,
      businessInfo: {
        phone: storePhone || phone,
        email,
        address: storeAddress || '',
      },
      subscription: {
        plan: 'trial',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        maxProducts: 50,
        maxCustomers: 100,
        maxUsers: 3,
      },
    });

    // Create User (Vendor role)
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'admin',
      tenant: tenant._id,
    });

    // Link tenant to owner
    tenant.owner = user._id;
    await tenant.save();

    // Generate token
    const token = user.generateAuthToken();

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`New vendor registered: ${email} (Tenant: ${tenant.name})`);

    ApiResponse.created(res, {
      token,
      user: Helpers.sanitizeUser(user),
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        subscription: tenant.subscription,
      },
    }, 'تم إنشاء الحساب بنجاح');
  });

  /**
   * POST /api/v1/auth/login
   */
  login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(AppError.badRequest('البريد الإلكتروني وكلمة المرور مطلوبان'));
    }

    // Find user with password
    const user = await User.findOne({ email }).select('+password').populate('tenant', 'name slug branding subscription');

    if (!user || !(await user.comparePassword(password))) {
      return next(AppError.unauthorized('بيانات الدخول غير صحيحة'));
    }

    if (!user.isActive) {
      return next(AppError.unauthorized('تم تعطيل هذا الحساب'));
    }

    // Generate token
    const token = user.generateAuthToken();

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Audit log
    if (user.tenant) {
      AuditLog.log({
        tenant: user.tenant._id,
        user: user._id,
        action: 'login',
        resource: 'auth',
        details: { ip: req.ip },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }).catch(() => {});
    }

    // Get user permissions
    const permissions = await getUserPermissions(user);

    ApiResponse.success(res, {
      token,
      user: Helpers.sanitizeUser(user),
      tenant: user.tenant,
      permissions,
    }, 'تم تسجيل الدخول بنجاح');
  });

  /**
   * GET /api/v1/auth/me
   * Get current logged-in user
   */
  getMe = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id)
      .populate('tenant', 'name slug branding settings subscription')
      .populate('branch', 'name')
      .populate('customRole');

    // Get user permissions
    const permissions = await getUserPermissions(user);

    ApiResponse.success(res, {
      user: Helpers.sanitizeUser(user),
      tenant: user.tenant,
      permissions,
    });
  });

  /**
   * PUT /api/v1/auth/update-password
   */
  updatePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return next(AppError.unauthorized('كلمة المرور الحالية غير صحيحة'));
    }

    user.password = newPassword;
    await user.save();

    const token = user.generateAuthToken();

    ApiResponse.success(res, { token }, 'تم تغيير كلمة المرور بنجاح');
  });

  /**
   * POST /api/v1/auth/forgot-password
   * Send password reset email
   */
  forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
      return next(AppError.badRequest('البريد الإلكتروني مطلوب'));
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not (security)
      return ApiResponse.success(res, null, 'إذا كان البريد الإلكتروني مسجلاً، ستتلقى رسالة لإعادة تعيين كلمة المرور');
    }

    if (!user.isActive) {
      return next(AppError.badRequest('هذا الحساب معطل'));
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send email
    try {
      await emailService.sendPasswordResetEmail(user, resetToken);
      logger.info(`Password reset email sent to ${email}`);
    } catch (emailError) {
      // Reset token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error('Failed to send password reset email:', emailError);
      return next(AppError.internal('حدث خطأ في إرسال البريد الإلكتروني'));
    }

    ApiResponse.success(res, null, 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
  });

  /**
   * POST /api/v1/auth/reset-password/:token
   * Reset password with token
   */
  resetPassword = catchAsync(async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return next(AppError.badRequest('كلمة المرور الجديدة مطلوبة'));
    }

    if (password.length < 6) {
      return next(AppError.badRequest('كلمة المرور لا تقل عن 6 أحرف'));
    }

    // Hash the token from URL
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(AppError.badRequest('الرابط غير صالح أو منتهي الصلاحية'));
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Generate new token
    const authToken = user.generateAuthToken();

    logger.info(`Password reset successful for ${user.email}`);

    ApiResponse.success(res, { token: authToken }, 'تم إعادة تعيين كلمة المرور بنجاح');
  });

  /**
   * PUT /api/v1/auth/update-profile
   * Update user name and phone
   */
  updateProfile = catchAsync(async (req, res, next) => {
    const { name, phone } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save({ validateBeforeSave: false });

    ApiResponse.success(res, { user: Helpers.sanitizeUser(user) }, 'تم تحديث الملف الشخصي بنجاح');
  });

  /**
   * PUT /api/v1/auth/update-avatar
   * Upload user avatar
   */
  updateAvatar = catchAsync(async (req, res, next) => {
    if (!req.file) return next(AppError.badRequest('يرجى اختيار صورة'));

    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    user.avatar = `/uploads/images/${req.file.filename}`;
    await user.save({ validateBeforeSave: false });

    ApiResponse.success(res, { avatar: user.avatar }, 'تم تحديث الصورة الشخصية');
  });

  /**
   * DELETE /api/v1/auth/remove-avatar
   * Remove user avatar
   */
  removeAvatar = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    user.avatar = null;
    await user.save({ validateBeforeSave: false });

    ApiResponse.success(res, null, 'تم حذف الصورة الشخصية');
  });

  /**
   * POST /api/v1/auth/add-user
   * Add a user to the tenant (supplier, coordinator, etc.)
   */
  addUser = catchAsync(async (req, res, next) => {
    const { name, email, phone, password, role } = req.body;

    // Validate role
    const allowedRoles = ['vendor', 'coordinator', 'supplier', 'customer'];
    if (!allowedRoles.includes(role)) {
      return next(AppError.badRequest('الدور غير مسموح به'));
    }

    // Check if email exists in this tenant
    const existing = await User.findOne({ email, tenant: req.tenantId });
    if (existing) {
      return next(AppError.badRequest('البريد الإلكتروني موجود بالفعل في هذا المتجر'));
    }

    const user = await User.create({
      name,
      email,
      phone,
      password: password || '123456', // Default password if not provided
      role,
      tenant: req.tenantId,
    });

    ApiResponse.created(res, {
      user: Helpers.sanitizeUser(user),
    }, 'تم إضافة المستخدم بنجاح');
  });

  /**
   * GET /api/v1/auth/users
   * Get all users for the current tenant
   */
  getTenantUsers = catchAsync(async (req, res, next) => {
    const { page, limit, skip } = Helpers.getPaginationParams(req.query);
    const filter = { 
      tenant: req.tenantId,
      _id: { $ne: req.user._id } // Exclude current user
    };

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .select('-password'),
      User.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, users, { page, limit, total });
  });

  /**
   * PUT /api/v1/auth/users/:id
   * Update a user in the current tenant
   */
  updateTenantUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, phone, role, password, isActive } = req.body;

    const user = await User.findOne({ _id: id, tenant: req.tenantId });
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) user.password = password;

    await user.save();

    ApiResponse.success(res, { user: Helpers.sanitizeUser(user) }, 'تم تحديث البيانات بنجاح');
  });

  /**
   * DELETE /api/v1/auth/users/:id
   * Deactivate a user in the current tenant
   */
  deleteTenantUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, tenant: req.tenantId });
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    // Prevent deleting the last vendor/admin? 
    // For now just soft delete
    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    ApiResponse.success(res, null, 'تم تعطيل المستخدم');
  });

  /**
   * POST /api/v1/auth/logout
   */
  logout = catchAsync(async (req, res, next) => {
    if (req.user) {
      await AuditLog.log({
        tenant: req.user.tenant,
        user: req.user._id,
        action: 'logout',
        resource: 'auth',
        details: { ip: req.ip },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }
    ApiResponse.success(res, null, 'تم تسجيل الخروج بنجاح');
  });
}

module.exports = new AuthController();
