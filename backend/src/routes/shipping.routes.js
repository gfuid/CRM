const express = require('express');
const router = express.Router();
const shipping = require('../controllers/shipping.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { enforceStorageQuota } = require('../utils/usage');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/', asyncHandler(shipping.listSheets));
router.put('/settings', asyncHandler(shipping.saveSettings));
router.put('/sheets/:id', enforceStorageQuota, asyncHandler(shipping.saveSheet));
router.delete('/sheets/:id', asyncHandler(shipping.deleteSheet));

module.exports = router;
