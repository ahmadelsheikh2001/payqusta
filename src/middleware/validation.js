const { body, param, query, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Input Validation Middleware
 * Provides validation rules and error handling for API inputs
 */

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join('، ');
    return next(AppError.badRequest(errorMessages));
  }

  next();
};

/**
 * Common validation rules
 */
const commonValidations = {
  // MongoDB ObjectId
  mongoId: (fieldName = 'id') =>
    param(fieldName)
      .isMongoId()
      .withMessage(`${fieldName} غير صحيح`),

  // Email
  email: (fieldName = 'email') =>
    body(fieldName)
      .isEmail()
      .normalizeEmail()
      .withMessage('البريد الإلكتروني غير صحيح'),

  // Phone (Egyptian format)
  phone: (fieldName = 'phone') =>
    body(fieldName)
      .matches(/^(010|011|012|015)\d{8}$/)
      .withMessage('رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015'),

  // Password
  password: (fieldName = 'password') =>
    body(fieldName)
      .isLength({ min: 6 })
      .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      .matches(/\d/)
      .withMessage('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل'),

  // Name (Arabic or English)
  name: (fieldName = 'name') =>
    body(fieldName)
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('الاسم يجب أن يكون بين 2 و 100 حرف')
      .matches(/^[\u0600-\u06FFa-zA-Z\s]+$/)
      .withMessage('الاسم يجب أن يحتوي على حروف عربية أو إنجليزية فقط'),

  // Number (positive)
  positiveNumber: (fieldName) =>
    body(fieldName)
      .isFloat({ min: 0 })
      .withMessage(`${fieldName} يجب أن يكون رقم موجب`),

  // Integer (positive)
  positiveInt: (fieldName) =>
    body(fieldName)
      .isInt({ min: 0 })
      .withMessage(`${fieldName} يجب أن يكون رقم صحيح موجب`),

  // Date
  date: (fieldName) =>
    body(fieldName)
      .optional()
      .isISO8601()
      .withMessage(`${fieldName} يجب أن يكون تاريخ صحيح`),

  // Boolean
  boolean: (fieldName) =>
    body(fieldName)
      .optional()
      .isBoolean()
      .withMessage(`${fieldName} يجب أن يكون true أو false`),

  // URL
  url: (fieldName) =>
    body(fieldName)
      .optional()
      .isURL()
      .withMessage(`${fieldName} يجب أن يكون رابط صحيح`),
};

/**
 * Validation rules for specific endpoints
 */

// Auth validations
const authValidations = {
  register: [
    commonValidations.name('name'),
    commonValidations.email(),
    commonValidations.password(),
    body('storeName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('اسم المتجر يجب أن يكون بين 2 و 100 حرف'),
    handleValidationErrors,
  ],

  login: [
    commonValidations.email(),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
    handleValidationErrors,
  ],

  forgotPassword: [
    commonValidations.email(),
    handleValidationErrors,
  ],

  resetPassword: [
    param('token').notEmpty().withMessage('Token مطلوب'),
    commonValidations.password('newPassword'),
    handleValidationErrors,
  ],

  updatePassword: [
    body('currentPassword').notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),
    commonValidations.password('newPassword'),
    handleValidationErrors,
  ],
};

// Product validations
const productValidations = {
  create: [
    commonValidations.name('name'),
    body('sku').trim().notEmpty().withMessage('SKU مطلوب'),
    commonValidations.positiveNumber('purchasePrice'),
    commonValidations.positiveNumber('sellingPrice'),
    body('category').optional().trim().isLength({ max: 50 }),
    commonValidations.positiveInt('stock.quantity'),
    commonValidations.positiveInt('stock.minQuantity'),
    handleValidationErrors,
  ],

  update: [
    commonValidations.mongoId('id'),
    commonValidations.name('name').optional(),
    commonValidations.positiveNumber('purchasePrice').optional(),
    commonValidations.positiveNumber('sellingPrice').optional(),
    handleValidationErrors,
  ],
};

// Customer validations
const customerValidations = {
  create: [
    commonValidations.name('name'),
    commonValidations.phone(),
    commonValidations.email().optional(),
    body('address').optional().trim().isLength({ max: 500 }),
    handleValidationErrors,
  ],

  update: [
    commonValidations.mongoId('id'),
    commonValidations.name('name').optional(),
    commonValidations.phone().optional(),
    handleValidationErrors,
  ],
};

// Invoice validations
const invoiceValidations = {
  create: [
    commonValidations.mongoId('customer').custom((value, { req }) => {
      req.body.customer = value; // Normalize field name
      return true;
    }),
    body('items')
      .isArray({ min: 1 })
      .withMessage('يجب إضافة منتج واحد على الأقل'),
    body('items.*.product')
      .isMongoId()
      .withMessage('معرف المنتج غير صحيح'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('الكمية يجب أن تكون رقم صحيح موجب'),
    body('paymentMethod')
      .isIn(['cash', 'deferred', 'installment'])
      .withMessage('طريقة الدفع غير صحيحة'),
    handleValidationErrors,
  ],
};

// Supplier validations
const supplierValidations = {
  create: [
    commonValidations.name('name'),
    commonValidations.phone(),
    body('contactPerson').optional().trim().isLength({ max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
    handleValidationErrors,
  ],
};

// Expense validations
const expenseValidations = {
  create: [
    body('category')
      .trim()
      .notEmpty()
      .withMessage('الفئة مطلوبة')
      .isLength({ max: 50 }),
    commonValidations.positiveNumber('amount'),
    body('description').optional().trim().isLength({ max: 500 }),
    commonValidations.date('date'),
    handleValidationErrors,
  ],
};

// Query validations
const queryValidations = {
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('رقم الصفحة غير صحيح'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('الحد الأقصى للعناصر يجب أن يكون بين 1 و 100'),
    handleValidationErrors,
  ],

  dateRange: [
    query('startDate').optional().isISO8601().withMessage('تاريخ البداية غير صحيح'),
    query('endDate').optional().isISO8601().withMessage('تاريخ النهاية غير صحيح'),
    handleValidationErrors,
  ],
};

module.exports = {
  // Common validations
  commonValidations,
  handleValidationErrors,

  // Specific validations
  authValidations,
  productValidations,
  customerValidations,
  invoiceValidations,
  supplierValidations,
  expenseValidations,
  queryValidations,
};