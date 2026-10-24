const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performance.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

// What is due today / overdue for the logged-in user (owners also get a team summary)
router.get('/', asyncHandler(performanceController.getReminders));

module.exports = router;
