const express = require('express');
const router = express.Router();
const followUpController = require('../controllers/followUp.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/', asyncHandler(followUpController.getFollowUps));
router.post('/', asyncHandler(followUpController.createFollowUp));
router.put('/:id', asyncHandler(followUpController.updateFollowUp));
router.patch('/:id', asyncHandler(followUpController.updateFollowUp));
router.delete('/:id', asyncHandler(followUpController.deleteFollowUp));

module.exports = router;
