/**
 * Global Error Handling Middleware
 * Centralizes all error responses
 */

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Handle specific Mongoose errors
 */
const handleCastError = (err) => {
  return new AppError(`قيمة غير صالحة: ${err.value}`, 400);
};

const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const translations = {
    barcode: 'الباركود',
    sku: 'كود SKU',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    nationalId: 'الرقم القومي',
    whatsappNumber: 'رقم واتساب',
  };
  const fieldName = translations[field] || field;
  return new AppError(`القيمة "${err.keyValue[field] || ''}" مستخدمة بالفعل في حقل "${fieldName}"`, 409);
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(messages.join('. '), 422);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message, stack: err.stack };

  // Log error
  logger.error(`${err.name}: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') error = handleCastError(err);

  // Mongoose duplicate key
  if (err.code === 11000) error = handleDuplicateKey(err);

  // Mongoose validation error
  if (err.name === 'ValidationError') error = handleValidationError(err);

  // JWT errors are handled in auth middleware

  const statusCode = error.statusCode || 500;
  const message = error.isOperational
    ? error.message
    : 'حدث خطأ داخلي في الخادم';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack,
    }),
  });
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  next(new AppError(`المسار ${req.originalUrl} غير موجود`, 404));
};

module.exports = { errorHandler, notFound };
