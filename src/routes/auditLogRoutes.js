const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// Protect all routes
router.use(protect);
router.use(authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN));

router.get('/', auditLogController.getAuditLogs);
router.get('/active-users', auditLogController.getActiveUsers);
router.get('/login-history', auditLogController.getLoginHistory);

module.exports = router;
