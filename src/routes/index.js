/**
 * API Routes — Central Router
 */

const router = require('express').Router();
// Import checkLimit
const checkLimit = require('../middleware/checkLimit');
const { protect, authorize, tenantScope, publicTenantScope, auditLog } = require('../middleware/auth');
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const notificationController = require('../controllers/notificationController');
const expenseController = require('../controllers/expenseController');
const settingsController = require('../controllers/settingsController');
const adminController = require('../controllers/adminController');
const tenantController = require('../controllers/tenantController');
const reportsController = require('../controllers/reportsController');
const searchController = require('../controllers/searchController');
const importController = require('../controllers/importController');
const backupController = require('../controllers/backupController');
const supplierController = require('../controllers/supplierController');
const { uploadSingle } = require('../middleware/upload');

// ============ APP INFO ============
router.get('/health', async (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// ============ PORTAL ROUTES (Customer App) ============
router.use('/portal', require('./portal/authRoutes'));

// ============ AUTH ROUTES (Public) ============
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password/:token', authController.resetPassword);
router.post('/auth/logout', protect, authController.logout);
router.post('/auth/logout-all', protect, authController.logoutAll);

// ============ PUBLIC STOREFRONT ROUTES ============
// Note: Product/Customer public routes are now handled dynamically or need to be potentially routed via the modules if they support public access.
// For now, retaining the specific public overrides here or ensuring modules handle them.
// The previous index.js had specific public routes for products/settings.
router.get('/settings', publicTenantScope, settingsController.getSettings);

// We need to route public product requests to the product controller, but scoped.
// Since we moved standard product routes to ./productRoutes, we can mount them there.
// However, public routes use 'publicTenantScope'.
// Let's keep specific public routes here for clarity and safety as they use different middleware.
const productController = require('../controllers/productController');
const customerController = require('../controllers/customerController');
const invoiceController = require('../controllers/invoiceController');

// Product Public Routes - Move to /store or similar to avoid conflict with Admin API
// router.get('/products', publicTenantScope, productController.getAll);
// router.get('/products/categories', publicTenantScope, productController.getCategories);
// router.get('/products/barcode/:code', publicTenantScope, productController.getByBarcode);
// router.get('/products/:id([0-9a-fA-F]{24})', publicTenantScope, productController.getById);

// Public Checkout Routes
router.post('/customers', (req, res, next) => {
  if (req.headers['x-source'] === 'online_store') return next();
  protect(req, res, next);
}, publicTenantScope, customerController.create);

router.post('/invoices', (req, res, next) => {
  if (req.body.source === 'online_store') return next();
  protect(req, res, next);
}, publicTenantScope, invoiceController.create);

// ============ SUPER ADMIN ROUTES ============
router.use('/super-admin', protect, require('./superAdminRoutes'));

// ============ PROTECTED ROUTES ============
router.use(protect); // All routes below require authentication
router.use(tenantScope); // All routes below are tenant-scoped

// --- Auth ---
router.get('/auth/me', authController.getMe);
router.put('/auth/update-password', authController.updatePassword);
router.put('/auth/update-profile', authController.updateProfile);
router.put('/auth/update-avatar', uploadSingle, authController.updateAvatar);
router.delete('/auth/remove-avatar', authController.removeAvatar);
router.get('/auth/users', authorize('vendor', 'admin'), authController.getTenantUsers);
router.post('/auth/users', authorize('vendor', 'admin'), checkLimit('user'), authController.addUser);
router.put('/auth/users/:id', authorize('vendor', 'admin'), authController.updateTenantUser);
router.delete('/auth/users/:id', authorize('vendor', 'admin'), authController.deleteTenantUser);
router.post('/auth/add-user', authorize('vendor', 'admin'), checkLimit('user'), authController.addUser);
router.post('/auth/switch-tenant', tenantController.switchTenant);

// --- Tenant / Branches ---
// Note: /tenants/branch removed - use /branches instead (branchController is more complete)
router.use('/branches', require('./branchRoutes'));

// --- Dashboard ---
router.get('/dashboard/overview', authorize('vendor', 'admin', 'coordinator'), dashboardController.getOverview);
router.get('/dashboard/sales-report', authorize('vendor', 'admin', 'coordinator'), dashboardController.getSalesReport);
router.get('/dashboard/profit-intelligence', authorize('vendor', 'admin'), dashboardController.getProfitIntelligence);
router.get('/dashboard/risk-scoring', authorize('vendor', 'admin'), dashboardController.getRiskScoring);
router.get('/dashboard/daily-collections', authorize('vendor', 'admin', 'coordinator'), dashboardController.getDailyCollections);
router.get('/dashboard/aging-report', authorize('vendor', 'admin', 'coordinator'), dashboardController.getAgingReport);
router.get('/dashboard/business-health', authorize('vendor', 'admin'), dashboardController.getBusinessHealth);
router.get('/dashboard/cash-flow-forecast', authorize('vendor', 'admin'), dashboardController.getCashFlowForecast);
router.get('/dashboard/smart-assistant', authorize('vendor', 'admin'), dashboardController.getSmartAssistant);
router.get('/dashboard/real-profit', authorize('vendor', 'admin'), dashboardController.getRealProfit);
router.get('/dashboard/credit-engine', authorize('vendor', 'admin'), dashboardController.getCreditEngine);
router.get('/dashboard/customer-lifetime-value', authorize('vendor', 'admin'), dashboardController.getCustomerLifetimeValue);

// ============ MODULAR ROUTES ============
router.use('/products', require('./productRoutes'));
router.use('/customers', require('./customerRoutes'));
router.use('/invoices', require('./invoiceRoutes'));
router.use('/bi', require('./biRoutes'));

// --- Suppliers --- (coordinator can view)
router.get('/suppliers', authorize('vendor', 'admin', 'coordinator'), supplierController.getAll);
router.get('/suppliers/upcoming-payments', authorize('vendor', 'admin', 'coordinator'), supplierController.getUpcomingPayments);
router.get('/suppliers/:id', authorize('vendor', 'admin', 'coordinator'), supplierController.getById);
router.get('/suppliers/:id/low-stock-products', authorize('vendor', 'admin', 'coordinator'), supplierController.getLowStockProducts);
router.post('/suppliers', authorize('vendor', 'admin'), auditLog('create', 'supplier'), supplierController.create);
router.put('/suppliers/:id', authorize('vendor', 'admin'), auditLog('update', 'supplier'), supplierController.update);
router.delete('/suppliers/:id', authorize('vendor', 'admin'), auditLog('delete', 'supplier'), supplierController.delete);
router.post('/suppliers/:id/purchase', authorize('vendor', 'admin'), auditLog('payment', 'supplier'), supplierController.recordPurchase);
router.post('/suppliers/:id/payments/:paymentId/pay', authorize('vendor', 'admin'), auditLog('payment', 'supplier'), supplierController.recordPayment);
router.post('/suppliers/:id/pay-all', authorize('vendor', 'admin'), auditLog('payment', 'supplier'), supplierController.payAllOutstanding);
router.post('/suppliers/:id/send-reminder', authorize('vendor', 'admin'), supplierController.sendReminder);
router.post('/suppliers/:id/request-restock', authorize('vendor', 'admin', 'coordinator'), supplierController.requestRestock);

// --- Notifications ---
router.get('/notifications', notificationController.getAll);
router.get('/notifications/unread-count', notificationController.getUnreadCount);
router.get('/notifications/stream', notificationController.stream);
router.patch('/notifications/read-all', notificationController.markAllAsRead);
router.patch('/notifications/:id/read', notificationController.markAsRead);
router.delete('/notifications/:id', notificationController.deleteOne);

// --- Stock Adjustments ---
router.use('/stock-adjustments', require('./stockAdjustmentRoutes'));

// --- Cash Shifts ---
router.use('/cash-shifts', require('./cashShiftRoutes'));

// --- Expenses ---
router.get('/expenses', authorize('vendor', 'admin', 'coordinator'), expenseController.getAll);
router.get('/expenses/summary', authorize('vendor', 'admin', 'coordinator'), expenseController.getSummary);
router.get('/expenses/categories', authorize('vendor', 'admin', 'coordinator'), expenseController.getCategories);
router.post('/expenses', authorize('vendor', 'admin'), auditLog('create', 'expense'), expenseController.create);
router.put('/expenses/:id', authorize('vendor', 'admin'), auditLog('update', 'expense'), expenseController.update);
router.delete('/expenses/:id', authorize('vendor', 'admin'), auditLog('delete', 'expense'), expenseController.delete);

// --- Settings ---
router.put('/settings/store', authorize('vendor', 'admin'), settingsController.updateStore);
router.put('/settings/whatsapp', authorize('vendor', 'admin'), settingsController.updateWhatsApp);
router.post('/settings/whatsapp/test', authorize('vendor', 'admin'), settingsController.testWhatsApp);
router.get('/settings/whatsapp/templates', authorize('vendor', 'admin', 'coordinator'), settingsController.checkWhatsAppTemplates);
router.post('/settings/whatsapp/create-templates', authorize('vendor', 'admin'), settingsController.createWhatsAppTemplates);
router.post('/settings/whatsapp/detect-templates', authorize('vendor', 'admin'), settingsController.detectTemplates);
router.post('/settings/whatsapp/apply-templates', authorize('vendor', 'admin'), settingsController.applyTemplateMapping);
router.put('/settings/branding', authorize('vendor', 'admin'), settingsController.updateBranding);
router.put('/settings/user', settingsController.updateUser);
router.put('/settings/password', settingsController.changePassword);
router.put('/settings/categories', authorize('vendor', 'admin'), settingsController.updateCategories);
router.delete('/settings/categories/:name', authorize('vendor', 'admin'), settingsController.deleteCategory);

// --- Owner Management (Returns, KYC, Support) ---
const ownerMgmt = require('../controllers/ownerManagementController');
router.get('/manage/returns', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.getReturns);
router.patch('/manage/returns/:id', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.updateReturn);
router.get('/manage/documents', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.getDocuments);
router.patch('/manage/documents/:customerId/:docId', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.reviewDocument);
router.get('/manage/support', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.getSupportMessages);
router.get('/manage/support/:id', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.getSupportMessage);
router.post('/manage/support/:id/reply', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.replySupportMessage);
router.patch('/manage/support/:id/close', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.closeSupportMessage);

// --- Roles & Permissions ---
const roleController = require('../controllers/roleController');
router.get('/roles', authorize('vendor', 'admin'), roleController.getAll);
router.get('/roles/:id', authorize('vendor', 'admin'), roleController.getById);
router.post('/roles', authorize('vendor', 'admin'), roleController.create);
router.put('/roles/:id', authorize('vendor', 'admin'), roleController.update);
router.delete('/roles/:id', authorize('vendor', 'admin'), roleController.delete);

// --- Purchase Orders ---
const purchaseOrderController = require('../controllers/purchaseOrderController');
router.get('/purchase-orders', authorize('vendor', 'admin'), purchaseOrderController.getAll);
router.get('/purchase-orders/:id', authorize('vendor', 'admin'), purchaseOrderController.getById);
router.post('/purchase-orders', authorize('vendor', 'admin'), purchaseOrderController.create);
router.put('/purchase-orders/:id', authorize('vendor', 'admin'), purchaseOrderController.update);
router.post('/purchase-orders/:id/receive', authorize('vendor', 'admin'), purchaseOrderController.receive);
router.delete('/purchase-orders/:id', authorize('vendor', 'admin'), purchaseOrderController.delete);

// --- Payment Gateway ---
router.use('/payments', require('./paymentRoutes'));

// --- Field Collection ---
router.use('/collection', require('./collectionRoutes'));

// ============ ADMIN ROUTES (Super Admin Only) ============
router.get('/admin/dashboard', authorize('admin'), adminController.getDashboard);
router.get('/admin/statistics', authorize('admin'), adminController.getStatistics);

// Tenant Management
router.get('/admin/tenants', authorize('admin'), adminController.getTenants);
router.post('/admin/tenants', authorize('admin'), auditLog('create', 'tenant'), adminController.createTenant);
router.put('/admin/tenants/:id', authorize('admin'), auditLog('update', 'tenant'), adminController.updateTenant);
router.delete('/admin/tenants/:id', authorize('admin'), auditLog('delete', 'tenant'), adminController.deleteTenant);
router.post('/admin/tenants/:id/reset-password', authorize('admin'), adminController.resetTenantPassword);

// User Management
router.get('/admin/users', authorize('admin'), adminController.getUsers);
router.post('/admin/users', authorize('admin'), auditLog('create', 'user'), adminController.createUser);
router.put('/admin/users/:id', authorize('admin'), auditLog('update', 'user'), adminController.updateUser);
router.delete('/admin/users/:id', authorize('admin'), auditLog('delete', 'user'), adminController.deleteUser);

// Audit Logs
router.get('/admin/audit-logs', authorize('admin'), adminController.getAuditLogs);
router.use('/audit-logs', require('./auditLogRoutes'));

// ============ REPORTS ROUTES ============
router.get('/reports/sales', authorize('vendor', 'admin', 'coordinator'), reportsController.getSalesReport);
router.get('/reports/profit', authorize('vendor', 'admin'), reportsController.getProfitReport);
router.get('/reports/inventory', authorize('vendor', 'admin', 'coordinator'), reportsController.getInventoryReport);
router.get('/reports/customers', authorize('vendor', 'admin', 'coordinator'), reportsController.getCustomerReport);
router.get('/reports/products', authorize('vendor', 'admin', 'coordinator'), reportsController.getProductPerformanceReport);

// Export Reports
router.get('/reports/export/sales', authorize('vendor', 'admin', 'coordinator'), reportsController.exportSalesReport);
router.get('/reports/export/profit', authorize('vendor', 'admin'), reportsController.exportProfitReport);
router.get('/reports/export/inventory', authorize('vendor', 'admin', 'coordinator'), reportsController.exportInventoryReport);
router.get('/reports/export/customers', authorize('vendor', 'admin', 'coordinator'), reportsController.exportCustomerReport);
router.get('/reports/export/products', authorize('vendor', 'admin', 'coordinator'), reportsController.exportProductPerformanceReport);

// ============ SEARCH ROUTES ============
router.get('/search', searchController.globalSearch);
router.get('/search/suggestions', searchController.getSearchSuggestions);
router.get('/search/quick', searchController.quickSearchByBarcode);

// ============ IMPORT ROUTES ============
const multer = require('multer');
const importUpload = multer({
  dest: 'uploads/imports/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

router.post('/import/products', authorize('vendor', 'admin'), checkLimit('product'), importUpload.single('file'), auditLog('import', 'product'), importController.importProducts);
router.post('/import/customers', authorize('vendor', 'admin'), importUpload.single('file'), auditLog('import', 'customer'), importController.importCustomers);
router.post('/import/preview', authorize('vendor', 'admin'), importUpload.single('file'), importController.previewFile);
router.get('/import/template/:type', authorize('vendor', 'admin'), importController.downloadTemplate);

// ============ REVIEWS ROUTES ============
const reviewController = require('../controllers/reviewController');
router.get('/reviews', authorize('vendor', 'admin', 'coordinator'), reviewController.getAll);
router.get('/reviews/stats', authorize('vendor', 'admin'), reviewController.getStats);
router.get('/reviews/product/:productId', reviewController.getProductReviews);
router.get('/reviews/:id', authorize('vendor', 'admin', 'coordinator'), reviewController.getById);
router.patch('/reviews/:id/status', authorize('vendor', 'admin'), reviewController.updateStatus);
router.post('/reviews/:id/reply', authorize('vendor', 'admin'), reviewController.addReply);
router.delete('/reviews/:id', authorize('vendor', 'admin'), reviewController.delete);

// ============ COUPON ROUTES ============
const couponController = require('../controllers/couponController');
router.get('/coupons', authorize('vendor', 'admin'), couponController.getAll);
router.get('/coupons/stats', authorize('vendor', 'admin'), couponController.getStats);
router.post('/coupons/validate', couponController.validate); // Can be called from POS (vendor) or portal
router.get('/coupons/:id', authorize('vendor', 'admin'), couponController.getById);
router.post('/coupons', authorize('vendor', 'admin'), auditLog('create', 'coupon'), couponController.create);
router.put('/coupons/:id', authorize('vendor', 'admin'), couponController.update);
router.delete('/coupons/:id', authorize('vendor', 'admin'), auditLog('delete', 'coupon'), couponController.delete);

// ============ BACKUP ROUTES ============
router.get('/backup/export', authorize('vendor', 'admin'), backupController.exportData);
router.get('/backup/export-json', authorize('vendor', 'admin'), backupController.exportJSON);
router.get('/backup/stats', authorize('vendor', 'admin'), backupController.getStats);
router.post('/backup/restore', authorize('vendor', 'admin'), importUpload.single('file'), auditLog('restore', 'backup'), backupController.restoreData);

const backupUpload = multer({
  dest: 'uploads/imports/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for JSON
  fileFilter: (req, file, cb) => {
    const ext = require('path').extname(file.originalname).toLowerCase();
    cb(null, ext === '.json');
  },
});
router.post('/backup/restore-json', authorize('vendor', 'admin'), backupUpload.single('file'), auditLog('restore', 'backup'), backupController.restoreJSON);

module.exports = router;
