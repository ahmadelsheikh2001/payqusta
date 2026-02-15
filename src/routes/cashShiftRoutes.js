const express = require('express');
const router = express.Router();
const cashShiftController = require('../controllers/cashShiftController');
const auth = require('../middleware/auth');

router.use(auth.protect);

router.get('/current', cashShiftController.getCurrent);
router.post('/open', cashShiftController.openShift);
router.post('/close', cashShiftController.closeShift);
router.get('/history', cashShiftController.getHistory);

module.exports = router;
