/**
 * Branch Routes
 */

const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const checkLimit = require('../middleware/checkLimit');

// All routes require authentication (handled by parent router)

router.get('/', branchController.getBranches);
router.post('/', checkLimit('store'), branchController.createBranch);
router.put('/:id', branchController.updateBranch);
router.delete('/:id', branchController.deleteBranch);

// Branch Stats & Management
router.get('/:id/stats', branchController.getBranchStats);

// Shift Management
router.post('/:id/shift/start', branchController.startShift);
router.post('/:id/shift/end', branchController.endShift);

// Settlement
router.post('/:id/settlement', branchController.settleBranch);

module.exports = router;
