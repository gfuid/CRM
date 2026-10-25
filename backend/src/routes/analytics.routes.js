const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const performanceController = require('../controllers/performance.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/', asyncHandler(analyticsController.getAnalytics));
// Staff performance review (owner: any of their staff; staff: themselves)
router.get('/team', asyncHandler(performanceController.getTeamPerformance));
router.get('/daily-report', asyncHandler(performanceController.getDailyReport));
router.get('/staff/:id', asyncHandler(performanceController.getStaffPerformance));

module.exports = router;
