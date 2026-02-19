const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

exports.protectCustomer = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, message: 'غير مصرح لك بالدخول' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if customer exists
    const customer = await Customer.findById(decoded.id);

    if (!customer) {
      return res.status(401).json({ success: false, message: 'المستخدم غير موجود' });
    }

    if (!customer.isPortalActive) {
      return res.status(403).json({ success: false, message: 'تم تعطيل حسابك. يرجى الاتصال بالإدارة.' });
    }

    req.customer = customer;
    req.tenant = { _id: customer.tenant }; // Context for tenant-scoped queries
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'غير مصرح لك بالدخول' });
  }
};
