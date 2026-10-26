const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireOwner, requireSuperAdmin } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

// ------------------------------------------------------------------
// Staff management: company owners (scoped to their own staff) + Super Admin
// ------------------------------------------------------------------
router.get('/users', requireOwner, asyncHandler(adminController.getAllUsers));
router.get('/my-usage', requireOwner, asyncHandler(adminController.getMyUsage));
router.post('/users', requireOwner, asyncHandler(adminController.createUser));
router.patch('/users/:id', requireOwner, asyncHandler(adminController.updateUser));
router.patch('/users/:id/role', requireOwner, asyncHandler(adminController.updateUserRole));
router.patch('/users/:id/status', requireOwner, asyncHandler(adminController.toggleUserStatus));
router.delete('/users/:id', requireOwner, asyncHandler(adminController.deleteUser));

// ------------------------------------------------------------------
// Everything below is the platform operator's console only
// ------------------------------------------------------------------
router.use(requireSuperAdmin);

router.patch('/users/:id/staff-limit', asyncHandler(adminController.updateStaffLimit));
router.patch('/users/:id/storage-limit', asyncHandler(adminController.updateStorageLimit));

// AI assistant settings (key is stored encrypted and never sent back)
const support = require('../controllers/support.controller');
router.get('/ai-settings', asyncHandler(support.getAiSettings));
router.put('/ai-settings', asyncHandler(support.saveAiSettings));
router.post('/ai-settings/test', asyncHandler(support.testAi));

// Support tickets inbox for the platform team
router.get('/support/tickets', asyncHandler(support.listTickets));
router.get('/support/tickets/:id', asyncHandler(support.getTicket));
router.post('/support/tickets/:id/messages', asyncHandler(support.addMessage));
router.patch('/support/tickets/:id', asyncHandler(support.updateTicket));
router.patch('/users/:id/features', asyncHandler(adminController.updateUserFeatures));

router.get('/overview-summary', asyncHandler(adminController.getOverviewSummary));

router.get('/health', asyncHandler(adminController.getSystemHealth));
router.get('/developer-metrics', asyncHandler(adminController.getDeveloperMetrics));
router.post('/developer/sync-db', asyncHandler(adminController.triggerDbSync));
router.post('/developer/clear-metrics', asyncHandler(adminController.clearMetrics));

router.get('/audit-logs', asyncHandler(adminController.getAuditLogs));

router.patch('/settings', asyncHandler(adminController.updateCompanySettings));
router.get('/subscription', asyncHandler(adminController.getSubscriptionInfo));
router.post('/subscription/upgrade', asyncHandler(adminController.upgradePlan));

router.get('/tenants', asyncHandler(adminController.getAllTenants));
router.post('/tenants', asyncHandler(adminController.createTenant));
router.patch('/tenants/:id', asyncHandler(adminController.updateTenant));

router.post('/notifications', asyncHandler(adminController.sendNotification));
router.get('/notifications', asyncHandler(adminController.getAdminNotifications));
router.delete('/notifications/:id', asyncHandler(adminController.deleteAdminNotification));

module.exports = router;
