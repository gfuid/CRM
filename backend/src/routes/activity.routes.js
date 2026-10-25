const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { enforceStorageQuota } = require('../utils/usage');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);
router.use(enforceStorageQuota);

router.get('/', asyncHandler(activityController.getActivities));
router.post('/', asyncHandler(activityController.createActivity));

module.exports = router;
