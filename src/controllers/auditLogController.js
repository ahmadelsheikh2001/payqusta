const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

/**
 * Get all audit logs
 * @route GET /api/v1/audit-logs
 * @access Private (Admin)
 */
exports.getAuditLogs = catchAsync(async (req, res) => {
  const features = new APIFeatures(AuditLog.find({ tenant: req.user.tenant }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const logs = await features.query.populate('user', 'name role email');
  const count = await AuditLog.countDocuments({ tenant: req.user.tenant });

  res.status(200).json({
    success: true,
    count: logs.length,
    total: count,
    data: logs,
  });
});

/**
 * Get active users (users who logged in recently)
 * @route GET /api/v1/audit-logs/active-users
 * @access Private (Admin)
 */
exports.getActiveUsers = catchAsync(async (req, res) => {
  // Define "active" as logged in within the last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const users = await User.find({
    tenant: req.user.tenant,
    lastLogin: { $gte: yesterday },
  }).select('name email role branch lastLogin avatar');
  
  // Populate branch name
  await User.populate(users, { path: 'branch', select: 'name' });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

/**
 * Get login history
 * @route GET /api/v1/audit-logs/login-history
 * @access Private (Admin)
 */
exports.getLoginHistory = catchAsync(async (req, res) => {
  const logs = await AuditLog.find({
    tenant: req.user.tenant,
    action: 'login',
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('user', 'name role email branch');

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});
