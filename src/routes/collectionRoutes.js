/**
 * Field Collection Routes
 * API routes for field collection operations
 */

const router = require('express').Router();
const collectionController = require('../controllers/collectionController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ============ COLLECTOR ROUTES ============

// Tasks
router.get('/tasks/today', collectionController.getTodayTasks);
router.get('/tasks/:id', collectionController.getTask);
router.post('/tasks/:id/visit', collectionController.visitTask);
router.post('/tasks/:id/collect', collectionController.collectPayment);
router.post('/tasks/:id/skip', collectionController.skipTask);

// Routes
router.get('/routes/today', collectionController.getTodayRoute);
router.post('/routes/optimize', collectionController.optimizeRoute);
router.post('/routes/:id/start', collectionController.startRoute);
router.post('/routes/:id/complete', collectionController.completeRoute);
router.post('/routes/track', collectionController.trackLocation);

// ============ ADMIN/COORDINATOR ROUTES ============

router.get(
  '/collectors',
  authorize('vendor', 'admin', 'coordinator'),
  collectionController.getAllCollectors
);

router.get(
  '/collectors/:id/stats',
  authorize('vendor', 'admin', 'coordinator'),
  collectionController.getCollectorStats
);

router.post(
  '/collectors/:id/assign',
  authorize('vendor', 'admin', 'coordinator'),
  collectionController.assignTasks
);

module.exports = router;
