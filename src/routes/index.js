/**
 * API Routes — Central Router
 */

const router = require('express').Router();
const { protect, authorize, tenantScope, auditLog } = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const customerController = require('../controllers/customerController');
const supplierController = require('../controllers/supplierController');
const invoiceController = require('../controllers/invoiceController');
const dashboardController = require('../controllers/dashboardController');
const notificationController = require('../controllers/notificationController');
const expenseController = require('../controllers/expenseController');
const biController = require('../controllers/biController');
const settingsController = require('../controllers/settingsController');
const adminController = require('../controllers/adminController');
const reportsController = require('../controllers/reportsController');
const searchController = require('../controllers/searchController');
const importController = require('../controllers/importController');
const backupController = require('../controllers/backupController');
const { uploadSingle } = require('../middleware/upload');

// ============ HEALTH CHECK (Public) ============
router.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStatus[dbState] || 'unknown',
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
    version: require('../../package.json').version,
  });
});

// ============ AUTH ROUTES (Public) ============
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password/:token', authController.resetPassword);

// ============ PROTECTED ROUTES ============
router.use(protect); // All routes below require authentication
router.use(tenantScope); // All routes below are tenant-scoped

// --- Auth ---
router.get('/auth/me', authController.getMe);
router.put('/auth/update-password', authController.updatePassword);
router.put('/auth/update-profile', authController.updateProfile);
router.put('/auth/update-avatar', uploadSingle, authController.updateAvatar);
router.delete('/auth/remove-avatar', authController.removeAvatar);
router.post('/auth/add-user', authorize('vendor', 'admin'), authController.addUser);

// --- Dashboard --- (vendor, admin, coordinator can view)
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

// --- Products --- (coordinator can view and update stock)
router.get('/products', productController.getAll);
router.get('/products/low-stock', authorize('vendor', 'admin', 'coordinator'), productController.getLowStock);
router.get('/products/summary', authorize('vendor', 'admin', 'coordinator'), productController.getStockSummary);
router.get('/products/categories', productController.getCategories);
router.get('/products/barcode/:code', productController.getByBarcode); // Search by barcode/SKU
router.get('/products/:id', productController.getById);
router.post('/products', authorize('vendor', 'admin'), auditLog('create', 'product'), productController.create);
router.put('/products/:id', authorize('vendor', 'admin'), auditLog('update', 'product'), productController.update);
router.delete('/products/:id', authorize('vendor', 'admin'), auditLog('delete', 'product'), productController.delete);
router.patch('/products/:id/stock', authorize('vendor', 'admin', 'coordinator'), auditLog('stock_change', 'product'), productController.updateStock);
router.post('/products/:id/upload-image', authorize('vendor', 'admin'), uploadSingle, productController.uploadImage);
router.delete('/products/:id/images/:imageUrl', authorize('vendor', 'admin'), productController.deleteImage);

// --- Customers --- (coordinator can view)
router.get('/customers', authorize('vendor', 'admin', 'coordinator'), customerController.getAll);
router.get('/customers/top', authorize('vendor', 'admin', 'coordinator'), customerController.getTopCustomers);
router.get('/customers/debtors', authorize('vendor', 'admin', 'coordinator'), customerController.getDebtors);
router.get('/customers/:id', authorize('vendor', 'admin', 'coordinator'), customerController.getById);
router.get('/customers/:id/transactions', authorize('vendor', 'admin', 'coordinator'), customerController.getTransactionHistory);
router.get('/customers/:id/statement-pdf', authorize('vendor', 'admin', 'coordinator'), customerController.getStatementPDF);
router.get('/customers/:id/credit-assessment', authorize('vendor', 'admin', 'coordinator'), customerController.getCreditAssessment);
router.post('/customers', authorize('vendor', 'admin'), auditLog('create', 'customer'), customerController.create);
router.post('/customers/:id/send-statement', authorize('vendor', 'admin'), customerController.sendStatement);
router.post('/customers/:id/send-statement-pdf', authorize('vendor', 'admin', 'coordinator'), customerController.sendStatementPDF);
router.post('/customers/:id/block-sales', authorize('vendor', 'admin'), customerController.blockSales);
router.post('/customers/:id/unblock-sales', authorize('vendor', 'admin'), customerController.unblockSales);
router.put('/customers/:id', authorize('vendor', 'admin'), auditLog('update', 'customer'), customerController.update);
router.delete('/customers/:id', authorize('vendor', 'admin'), auditLog('delete', 'customer'), customerController.delete);

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

// --- Invoices --- (coordinator can view and create)
router.get('/invoices', authorize('vendor', 'admin', 'coordinator'), invoiceController.getAll);
router.get('/invoices/overdue', authorize('vendor', 'admin', 'coordinator'), invoiceController.getOverdue);
router.get('/invoices/upcoming-installments', authorize('vendor', 'admin', 'coordinator'), invoiceController.getUpcomingInstallments);
router.get('/invoices/sales-summary', authorize('vendor', 'admin', 'coordinator'), invoiceController.getSalesSummary);
router.get('/invoices/:id', authorize('vendor', 'admin', 'coordinator'), invoiceController.getById);
router.post('/invoices', authorize('vendor', 'admin', 'coordinator'), auditLog('invoice', 'invoice'), invoiceController.create);
router.post('/invoices/send-whatsapp-message', authorize('vendor', 'admin', 'coordinator'), invoiceController.sendWhatsAppMessage);
router.post('/invoices/:id/pay', authorize('vendor', 'admin', 'coordinator'), auditLog('payment', 'invoice'), invoiceController.recordPayment);
router.post('/invoices/:id/pay-all', authorize('vendor', 'admin'), auditLog('payment', 'invoice'), invoiceController.payAll);
router.post('/invoices/:id/send-whatsapp', authorize('vendor', 'admin', 'coordinator'), invoiceController.sendWhatsApp);

// --- Notifications ---
router.get('/notifications', notificationController.getAll);
router.get('/notifications/unread-count', notificationController.getUnreadCount);
router.get('/notifications/stream', notificationController.stream);
router.patch('/notifications/read-all', notificationController.markAllAsRead);
router.patch('/notifications/:id/read', notificationController.markAsRead);
router.delete('/notifications/:id', notificationController.deleteOne);

// --- Expenses --- (coordinator can view)
router.get('/expenses', authorize('vendor', 'admin', 'coordinator'), expenseController.getAll);
router.get('/expenses/summary', authorize('vendor', 'admin', 'coordinator'), expenseController.getSummary);
router.get('/expenses/categories', authorize('vendor', 'admin', 'coordinator'), expenseController.getCategories);
router.post('/expenses', authorize('vendor', 'admin'), auditLog('create', 'expense'), expenseController.create);
router.put('/expenses/:id', authorize('vendor', 'admin'), auditLog('update', 'expense'), expenseController.update);
router.delete('/expenses/:id', authorize('vendor', 'admin'), auditLog('delete', 'expense'), expenseController.delete);

// --- Business Intelligence --- (coordinator can view basic reports)
router.get('/bi/health-score', authorize('vendor', 'admin', 'coordinator'), biController.getHealthScore);
router.get('/bi/cash-flow-forecast', authorize('vendor', 'admin', 'coordinator'), biController.getCashFlowForecast);
router.get('/bi/command-center', authorize('vendor', 'admin', 'coordinator'), biController.getCommandCenter);
router.get('/bi/achievements', authorize('vendor', 'admin', 'coordinator'), biController.getAchievements);
router.get('/bi/customer-lifetime-value', authorize('vendor', 'admin'), biController.getCustomerLifetimeValue);
router.get('/bi/aging-report', authorize('vendor', 'admin', 'coordinator'), biController.getAgingReport);
router.get('/bi/real-profit', authorize('vendor', 'admin'), biController.getRealProfit);
router.post('/bi/what-if', authorize('vendor', 'admin'), biController.whatIfSimulator);

// --- Settings ---
router.get('/settings', settingsController.getSettings);
router.put('/settings/store', authorize('vendor', 'admin'), settingsController.updateStore);
router.put('/settings/whatsapp', authorize('vendor', 'admin'), settingsController.updateWhatsApp);
router.post('/settings/whatsapp/test', authorize('vendor', 'admin'), settingsController.testWhatsApp);
router.get('/settings/whatsapp/templates', authorize('vendor', 'admin', 'coordinator'), settingsController.checkWhatsAppTemplates);
router.put('/settings/branding', authorize('vendor', 'admin'), settingsController.updateBranding);
router.put('/settings/user', settingsController.updateUser);
router.put('/settings/password', settingsController.changePassword);

// --- Restock Request (Low Stock to Supplier) ---
router.post('/products/:id/request-restock', authorize('vendor', 'admin'), productController.requestRestock);
router.post('/products/request-restock-bulk', authorize('vendor', 'admin'), productController.requestRestockBulk);

// ============ ADMIN ROUTES (Super Admin Only) ============
// Admin Dashboard
router.get('/admin/dashboard', authorize('admin'), adminController.getDashboard);
router.get('/admin/statistics', authorize('admin'), adminController.getStatistics);

// Tenant Management
router.get('/admin/tenants', authorize('admin'), adminController.getTenants);
router.post('/admin/tenants', authorize('admin'), auditLog('create', 'tenant'), adminController.createTenant);
router.put('/admin/tenants/:id', authorize('admin'), auditLog('update', 'tenant'), adminController.updateTenant);
router.delete('/admin/tenants/:id', authorize('admin'), auditLog('delete', 'tenant'), adminController.deleteTenant);

// User Management (All tenants)
router.get('/admin/users', authorize('admin'), adminController.getUsers);
router.post('/admin/users', authorize('admin'), auditLog('create', 'user'), adminController.createUser);
router.put('/admin/users/:id', authorize('admin'), auditLog('update', 'user'), adminController.updateUser);
router.delete('/admin/users/:id', authorize('admin'), auditLog('delete', 'user'), adminController.deleteUser);

// Audit Logs
router.get('/admin/audit-logs', authorize('admin'), adminController.getAuditLogs);

// ============ REPORTS ROUTES ============
// Reports (vendor, admin, coordinator can view)
router.get('/reports/sales', authorize('vendor', 'admin', 'coordinator'), reportsController.getSalesReport);
router.get('/reports/profit', authorize('vendor', 'admin'), reportsController.getProfitReport);
router.get('/reports/inventory', authorize('vendor', 'admin', 'coordinator'), reportsController.getInventoryReport);
router.get('/reports/customers', authorize('vendor', 'admin', 'coordinator'), reportsController.getCustomerReport);
router.get('/reports/products', authorize('vendor', 'admin', 'coordinator'), reportsController.getProductPerformanceReport);

// Export Reports (Excel)
router.get('/reports/export/sales', authorize('vendor', 'admin', 'coordinator'), reportsController.exportSalesReport);
router.get('/reports/export/profit', authorize('vendor', 'admin'), reportsController.exportProfitReport);
router.get('/reports/export/inventory', authorize('vendor', 'admin', 'coordinator'), reportsController.exportInventoryReport);
router.get('/reports/export/customers', authorize('vendor', 'admin', 'coordinator'), reportsController.exportCustomerReport);
router.get('/reports/export/products', authorize('vendor', 'admin', 'coordinator'), reportsController.exportProductPerformanceReport);

// ============ SEARCH ROUTES ============
// Global Search (all users)
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

router.post('/import/products', authorize('vendor', 'admin'), importUpload.single('file'), auditLog('import', 'product'), importController.importProducts);
router.post('/import/customers', authorize('vendor', 'admin'), importUpload.single('file'), auditLog('import', 'customer'), importController.importCustomers);
router.post('/import/preview', authorize('vendor', 'admin'), importUpload.single('file'), importController.previewFile);
router.get('/import/template/:type', authorize('vendor', 'admin'), importController.downloadTemplate);

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

// ============ BULK OPERATIONS ============
router.post('/products/bulk-delete', authorize('vendor', 'admin'), auditLog('bulk_delete', 'product'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return next(require('../utils/AppError').badRequest('يرجى تحديد المنتجات'));
    const Product = require('../models/Product');
    const result = await Product.updateMany({ _id: { $in: ids }, ...req.tenantFilter }, { isActive: false });
    require('../utils/ApiResponse').success(res, { deletedCount: result.modifiedCount }, `تم حذف ${result.modifiedCount} منتج`);
  } catch (error) { next(error); }
});

router.post('/customers/bulk-delete', authorize('vendor', 'admin'), auditLog('bulk_delete', 'customer'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return next(require('../utils/AppError').badRequest('يرجى تحديد العملاء'));
    const Customer = require('../models/Customer');
    const result = await Customer.updateMany({ _id: { $in: ids }, ...req.tenantFilter }, { isActive: false });
    require('../utils/ApiResponse').success(res, { deletedCount: result.modifiedCount }, `تم حذف ${result.modifiedCount} عميل`);
  } catch (error) { next(error); }
});

module.exports = router;
