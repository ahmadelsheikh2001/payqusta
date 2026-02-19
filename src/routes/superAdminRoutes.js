/**
 * Super Admin Routes
 */

const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');

// All routes require Super Admin access
router.use(requireSuperAdmin);

router.get('/tenants', superAdminController.getAllTenants);
router.get('/analytics', superAdminController.getSystemAnalytics);
router.get('/tenants/:id/details', superAdminController.getTenantDetails);
router.post('/tenants', superAdminController.createTenant);
router.put('/tenants/:id', superAdminController.updateTenant);
router.delete('/tenants/:id', superAdminController.deleteTenant);
router.post('/tenants/:id/impersonate', superAdminController.impersonateTenant);

module.exports = router;
