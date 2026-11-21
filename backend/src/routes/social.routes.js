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

// AI Social Media Manager: Brand Profile -> month plan -> posts written from it -> scheduled
router.get('/brand', asyncHandler(sm.getBrand));
router.put('/brand', sm.ownerOnly, asyncHandler(sm.saveBrand));
router.post('/brand/draft', sm.ownerOnly, asyncHandler(sm.draftBrand));
router.get('/plan', asyncHandler(sm.getPlan));
router.post('/plan', sm.ownerOnly, asyncHandler(sm.makePlan));
router.put('/plan/:id', sm.ownerOnly, asyncHandler(sm.updatePlan));
router.delete('/plan/:id', sm.ownerOnly, asyncHandler(sm.deletePlan));
router.post('/plan/:id/write', sm.ownerOnly, asyncHandler(sm.writePlanPosts));
router.post('/plan/:id/schedule', sm.ownerOnly, asyncHandler(sm.schedulePlan));
router.post('/plan/:id/pictures', sm.ownerOnly, enforceStorageQuota, asyncHandler(sm.planPictures));
router.post('/plan/:id/facebook-only', sm.ownerOnly, asyncHandler(sm.planFacebookOnly));

// Part 2: results, monthly report + AI review, comments inbox (reply, make a lead)
router.post('/results/refresh', asyncHandler(sm.refreshResultsNow));
router.get('/report', asyncHandler(sm.getReport));
router.post('/report/review', sm.ownerOnly, asyncHandler(sm.reviewWithAi));
router.get('/comments', asyncHandler(sm.listComments));
router.post('/comments/:id/reply', asyncHandler(sm.replyComment));
router.put('/comments/:id', asyncHandler(sm.markComment));
router.post('/comments/:id/lead', asyncHandler(sm.commentToLead));

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
