const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.post('/login', authLimiter, asyncHandler(authController.login));
router.post('/register', authLimiter, asyncHandler(authController.register));
router.get('/me', authenticate, asyncHandler(authController.getProfile));
router.patch('/profile', authenticate, asyncHandler(authController.updateProfile));

module.exports = router;
