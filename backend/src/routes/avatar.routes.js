const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { enforceStorageQuota } = require('../utils/usage');
const asyncHandler = require('../utils/asyncHandler');
const avatar = require('../controllers/avatar.controller');

const router = express.Router();

// Upload needs a login; GET /api/v1/avatars/:id is mounted in app.js (public, before the rate limiter)
router.post('/', authenticate, enforceStorageQuota, asyncHandler(avatar.uploadAvatar));

module.exports = router;
