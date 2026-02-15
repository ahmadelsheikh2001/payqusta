const express = require('express');
const router = express.Router();
const adjustmentController = require('../controllers/stockAdjustmentController');
const auth = require('../middleware/auth');

router.use(auth.protect);

router.get('/', adjustmentController.getAll);
router.post('/', adjustmentController.create);

module.exports = router;
