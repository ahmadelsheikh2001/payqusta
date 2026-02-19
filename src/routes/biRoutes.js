const express = require('express');
const router = express.Router();
const biController = require('../controllers/biController');
const { authorize } = require('../middleware/auth');

// --- Business Intelligence ---
router.get('/health-score', authorize('vendor', 'admin', 'coordinator'), biController.getHealthScore);
router.get('/stock-forecast', authorize('vendor', 'admin', 'coordinator'), biController.getStockForecast);
router.get('/cash-flow-forecast', authorize('vendor', 'admin', 'coordinator'), biController.getCashFlowForecast);
router.get('/command-center', authorize('vendor', 'admin', 'coordinator'), biController.getCommandCenter);
router.get('/achievements', authorize('vendor', 'admin', 'coordinator'), biController.getAchievements);
router.get('/customer-lifetime-value', authorize('vendor', 'admin'), biController.getCustomerLifetimeValue);
router.get('/aging-report', authorize('vendor', 'admin', 'coordinator'), biController.getAgingReport);
router.get('/real-profit', authorize('vendor', 'admin'), biController.getRealProfit);
router.post('/what-if', authorize('vendor', 'admin'), biController.whatIfSimulator);

module.exports = router;
