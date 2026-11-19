const express = require('express');
const router = express.Router();
const ai = require('../controllers/aiCalls.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { enforceStorageQuota } = require('../utils/usage');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/status', asyncHandler(ai.getStatus));

// Everything below: company owner + AI Calling switched on by the platform admin
router.use(ai.requireFeature);

router.get('/dashboard', asyncHandler(ai.getDashboard));
router.get('/settings', asyncHandler(ai.getSettings));
router.put('/settings', asyncHandler(ai.connect));
router.put('/settings/options', asyncHandler(ai.saveOptions));
router.put('/settings/script', asyncHandler(ai.saveScript));
router.post('/test-call', asyncHandler(ai.testCall));

router.get('/tags', asyncHandler(ai.listTags));
router.get('/audience/preview', asyncHandler(ai.previewAudience));
router.get('/campaigns', asyncHandler(ai.listCampaigns));
router.post('/campaigns', enforceStorageQuota, asyncHandler(ai.createCampaign));
router.get('/campaigns/:id', asyncHandler(ai.getCampaign));
router.post('/campaigns/:id/pause', asyncHandler(ai.pauseCampaign));
router.post('/campaigns/:id/resume', asyncHandler(ai.resumeCampaign));
router.delete('/campaigns/:id', asyncHandler(ai.deleteCampaign));

router.get('/calls', asyncHandler(ai.listCalls));
router.get('/calls/:id', asyncHandler(ai.getCall));
router.get('/calls/:id/audio', asyncHandler(ai.getAudio));

module.exports = router;
