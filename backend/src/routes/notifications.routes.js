const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/', asyncHandler(notificationsController.getUserNotifications));
router.patch('/read-all', asyncHandler(notificationsController.markAllAsRead));
router.patch('/:id/read', asyncHandler(notificationsController.markAsRead));

module.exports = router;
