/**
 * Branch Routes
 */

const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');

// All routes require authentication (handled by parent router)

router.get('/', branchController.getBranches);
router.post('/', branchController.createBranch);
router.put('/:id', branchController.updateBranch);
router.delete('/:id', branchController.deleteBranch);

module.exports = router;
