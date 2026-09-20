const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leads.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/', asyncHandler(leadsController.getLeads));
router.get('/:id', asyncHandler(leadsController.getLeadById));
router.post('/', asyncHandler(leadsController.createLead));
router.put('/:id', asyncHandler(leadsController.updateLead));
router.patch('/:id', asyncHandler(leadsController.updateLead));
router.delete('/:id', asyncHandler(leadsController.deleteLead));

module.exports = router;
