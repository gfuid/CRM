const express = require('express');
const router = express.Router();
const support = require('../controllers/support.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { enforceStorageQuota } = require('../utils/usage');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

// AI help assistant
router.get('/assistant/status', asyncHandler(support.assistantStatus));
router.post('/assistant/chat', asyncHandler(support.assistantChat));

// Support tickets (staff: own, owner: company, super admin: all)
router.get('/tickets', asyncHandler(support.listTickets));
router.post('/tickets', enforceStorageQuota, asyncHandler(support.createTicket));
router.get('/tickets/:id', asyncHandler(support.getTicket));
router.post('/tickets/:id/messages', asyncHandler(support.addMessage));
router.patch('/tickets/:id', asyncHandler(support.updateTicket));

module.exports = router;
