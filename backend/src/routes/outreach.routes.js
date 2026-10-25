const express = require('express');
const router = express.Router();
const outreachController = require('../controllers/outreach.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { enforceStorageQuota } = require('../utils/usage');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);
router.use(enforceStorageQuota);

router.get('/', asyncHandler(outreachController.getOutreachMatrix));
router.post('/record', asyncHandler(outreachController.recordOutreach));

module.exports = router;
