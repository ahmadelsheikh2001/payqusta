const jwt = require('jsonwebtoken');
const Customer = require('../../models/Customer');
const AppError = require('../../utils/AppError');
const ApiResponse = require('../../utils/ApiResponse');

// Generate JWT Token
const signToken = (id) => {
  return jwt.sign({ id, role: 'customer' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Login customer
// @route   POST /api/v1/portal/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return next(new AppError('يرجى إدخال رقم الهاتف وكلمة المرور', 400));
    }

    const customers = await Customer.find({ phone }).select('+password +tenant');
    
    if (customers.length === 0) {
        return next(new AppError('بيانات الدخول غير صحيحة', 401));
    }
    
    let customer;
    if (customers.length > 1) {
        // Simple logic for now: Pick first active one or assume unique for now
        customer = customers[0];
    } else {
        customer = customers[0];
    }

    if (!customer.password) {
       return next(new AppError('لم يتم تفعيل حسابك للدخول بعد. يرجى مراجعة الإدارة.', 401));
    }

    const isMatch = await customer.matchPassword(password);

    if (!isMatch) {
      return next(new AppError('بيانات الدخول غير صحيحة', 401));
    }
    
    if (!customer.isPortalActive) {
        return next(new AppError('تم تعطيل حسابك', 403));
    }

    const token = signToken(customer._id);
    
    customer.lastLogin = Date.now();
    await customer.save({ validateBeforeSave: false });

    customer.password = undefined;

    res.status(200).json({
      success: true,
      token,
      user: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          role: 'customer',
          tenant: customer.tenant
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in customer
// @route   GET /api/v1/portal/auth/me
// @access  Private (Customer)
exports.getMe = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.customer.id).populate('tenant', 'name settings.branding');
    
    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};
