/**
 * Super Admin Middleware
 * Ensures only Super Admin can access certain routes
 */

const AppError = require('../utils/AppError');

const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return next(AppError.unauthorized('يجب تسجيل الدخول أولاً'));
  }

  if (!req.user.isSuperAdmin) {
    return next(AppError.forbidden('هذه الصفحة متاحة فقط لمدير النظام'));
  }

  next();
};

module.exports = { requireSuperAdmin };
