const express = require('express');
const router = express.Router();
const push = require('../controllers/push.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/', asyncHandler(push.getStatus));
router.post('/subscribe', asyncHandler(push.subscribe));
router.post('/unsubscribe', asyncHandler(push.unsubscribe));
router.post('/test', asyncHandler(push.test));

module.exports = router;
