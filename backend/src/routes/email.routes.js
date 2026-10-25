const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { enforceStorageQuota } = require('../utils/usage');
const asyncHandler = require('../utils/asyncHandler');

// Public one-click unsubscribe (signed token, no login)
router.get('/unsubscribe/:token', asyncHandler(emailController.unsubscribe));

router.use(authenticate);
router.use(enforceStorageQuota);

// Feature status is readable by any signed-in user so the UI can show the locked state
router.get('/status', asyncHandler(emailController.getStatus));

// Everything below: company owner + feature enabled by platform admin
router.use(emailController.requireFeature);

router.get('/settings', asyncHandler(emailController.getSettings));
router.put('/settings', asyncHandler(emailController.saveSettings));
router.post('/settings/test', asyncHandler(emailController.testSettings));

router.get('/tags', asyncHandler(emailController.getTags));
router.get('/audience/preview', asyncHandler(emailController.previewAudience));

router.get('/campaigns', asyncHandler(emailController.listCampaigns));
router.post('/campaigns', asyncHandler(emailController.createCampaign));
router.post('/campaigns/test', asyncHandler(emailController.sendTestCampaign));
router.get('/campaigns/:id', asyncHandler(emailController.getCampaign));
router.post('/campaigns/:id/send', asyncHandler(emailController.sendCampaign));
router.delete('/campaigns/:id', asyncHandler(emailController.deleteCampaign));

module.exports = router;
