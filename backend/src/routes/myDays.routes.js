const express = require('express');
const router = express.Router();
const myDaysController = require('../controllers/myDays.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/', asyncHandler(myDaysController.getMyDays));
router.post('/', asyncHandler(myDaysController.addMyDayItem));
router.patch('/:id/toggle', asyncHandler(myDaysController.toggleMyDayItem));
router.delete('/:id', asyncHandler(myDaysController.deleteMyDayItem));

module.exports = router;
