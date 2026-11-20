const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { enforceStorageQuota } = require('../utils/usage');
const asyncHandler = require('../utils/asyncHandler');
const sm = require('../controllers/social.controller');

const router = express.Router();

router.use(authenticate);
router.get('/status', asyncHandler(sm.getStatus));

router.use(sm.requireFeature);

// Accounts (owner connects; staff with access can see them)
router.get('/accounts', asyncHandler(sm.listAccounts));
router.post('/connect/meta', sm.ownerOnly, asyncHandler(sm.startConnect));
router.delete('/accounts/:id', sm.ownerOnly, asyncHandler(sm.disconnectAccount));

// The company's own AI keys (owner only) and AI helpers (owner + staff with access)
router.get('/ai', sm.ownerOnly, asyncHandler(sm.getAiSettings));
router.put('/ai', sm.ownerOnly, asyncHandler(sm.saveAiSettings));
router.post('/ai/test', sm.ownerOnly, asyncHandler(sm.testAi));
router.post('/ai/write', asyncHandler(sm.writeWithAi));
router.post('/ai/ideas', asyncHandler(sm.ideasWithAi));
router.post('/ai/image', enforceStorageQuota, asyncHandler(sm.imageWithAi));

// Pictures
router.post('/media', enforceStorageQuota, asyncHandler(sm.uploadMedia));

// Posts + calendar
router.get('/posts', asyncHandler(sm.listPosts));
router.post('/posts', asyncHandler(sm.createPost));
router.put('/posts/:id', asyncHandler(sm.updatePost));
router.delete('/posts/:id', asyncHandler(sm.deletePost));
router.post('/posts/:id/approve', sm.ownerOnly, asyncHandler(sm.approvePost));
router.post('/posts/:id/reject', sm.ownerOnly, asyncHandler(sm.rejectPost));
router.post('/posts/:id/retry', asyncHandler(sm.retryPost));

module.exports = router;
