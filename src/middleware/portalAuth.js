const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const Customer = require('../models/Customer');
const catchAsync = require('../utils/catchAsync');

exports.protectCustomer = catchAsync(async (req, res, next) => {
  // 1) Get token from header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(AppError.unauthorized('يجب تسجيل الدخول للوصول إلى هذه الصفحة'));
  }

  // 2) Verify token
  const decoded = await new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) reject(err);
      resolve(decoded);
    });
  });

  // 3) Check if customer still exists
  const customer = await Customer.findById(decoded.id);
  if (!customer) {
    return next(AppError.unauthorized('المستخدم لم يعد موجوداً'));
  }

  // 4) Check if user changed password after token was issued
  // (Optional, can implement later if passwordChangedAt field exists)

  // GRANT ACCESS
  req.user = customer;
  next();
});
