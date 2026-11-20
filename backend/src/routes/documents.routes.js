const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const dc = require('../controllers/documents.controller');

// Quotations + Proforma Invoices. The public share link (/documents/share/:token) is mounted in app.js.
const router = express.Router();
router.use(authenticate, dc.requireAccess);

router.get('/profile', asyncHandler(dc.getProfile));
router.put('/profile', dc.ownerOnly, asyncHandler(dc.saveProfile));

router.get('/prefill', asyncHandler(dc.prefill));
router.get('/', asyncHandler(dc.listDocs));
router.post('/', asyncHandler(dc.createDoc));
router.get('/:id', asyncHandler(dc.getDoc));
router.put('/:id', asyncHandler(dc.updateDoc));
router.delete('/:id', asyncHandler(dc.deleteDoc));
router.post('/:id/convert', asyncHandler(dc.convertDoc));
router.post('/:id/sent', asyncHandler(dc.markSent));
router.post('/:id/new-link', asyncHandler(dc.newShareLink));
router.get('/:id/pdf', asyncHandler(dc.getPdf));

module.exports = router;
