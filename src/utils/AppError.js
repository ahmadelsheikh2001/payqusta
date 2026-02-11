/**
 * Custom Application Error Class
 * Extends native Error for structured error handling
 */

class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Custom error code
   */
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'طلب غير صالح') {
    return new AppError(message, 400, 'BAD_REQUEST');
  }

  static unauthorized(message = 'غير مصرح بالدخول') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'ليس لديك صلاحية للوصول') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'المورد غير موجود') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message = 'تعارض في البيانات') {
    return new AppError(message, 409, 'CONFLICT');
  }

  static tooMany(message = 'تم تجاوز الحد المسموح') {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static internal(message = 'خطأ داخلي في الخادم') {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }
}

module.exports = AppError;
