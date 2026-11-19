const express = require('express');
const router = express.Router();
const wa = require('../controllers/whatsapp.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { enforceStorageQuota } = require('../utils/usage');
const asyncHandler = require('../utils/asyncHandler');

// Public: Meta's webhook and the template pictures are mounted in app.js (before the rate limiter).

router.use(authenticate);

// Readable by every signed-in user so the screen can show the locked state
router.get('/status', asyncHandler(wa.getStatus));

// Everything below: company owner + WhatsApp Marketing switched on by the platform admin
router.use(wa.requireFeature);

router.get('/dashboard', asyncHandler(wa.getDashboard));

router.get('/settings', asyncHandler(wa.getSettings));
router.put('/settings', asyncHandler(wa.saveSettings));
router.put('/settings/rates', asyncHandler(wa.saveRates));
router.post('/settings/disconnect', asyncHandler(wa.disconnect));

router.post('/media', enforceStorageQuota, asyncHandler(wa.uploadMedia));

router.get('/templates', asyncHandler(wa.listTemplates));
router.post('/templates/sync', asyncHandler(wa.syncTemplates));
router.post('/templates', asyncHandler(wa.createTemplate));
router.delete('/templates/:id', asyncHandler(wa.deleteTemplate));

router.get('/tags', asyncHandler(wa.listTags));
router.get('/audience/preview', asyncHandler(wa.previewAudience));
router.get('/campaigns', asyncHandler(wa.listCampaigns));
router.post('/campaigns', enforceStorageQuota, asyncHandler(wa.createCampaign));
router.get('/campaigns/:id', asyncHandler(wa.getCampaign));
router.post('/campaigns/:id/send', asyncHandler(wa.sendCampaign));
router.delete('/campaigns/:id', asyncHandler(wa.deleteCampaign));

router.get('/chats', asyncHandler(wa.listChats));
router.get('/chats/:waId', asyncHandler(wa.getChat));
router.post('/chats/:waId', asyncHandler(wa.replyInChat));

router.get('/rules', asyncHandler(wa.listRules));
router.post('/rules', asyncHandler(wa.saveRule));
router.put('/rules/:id', asyncHandler(wa.saveRule));
router.delete('/rules/:id', asyncHandler(wa.deleteRule));

module.exports = router;
