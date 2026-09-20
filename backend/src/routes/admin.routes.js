const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// User / Team management
router.get('/users', asyncHandler(adminController.getAllUsers));
router.post('/users', asyncHandler(adminController.createUser));
router.patch('/users/:id/role', asyncHandler(adminController.updateUserRole));
router.patch('/users/:id/status', asyncHandler(adminController.toggleUserStatus));

// Consolidated Overview Summary
router.get('/overview-summary', asyncHandler(adminController.getOverviewSummary));

// System performance & health
router.get('/health', asyncHandler(adminController.getSystemHealth));

// Audit trail
router.get('/audit-logs', asyncHandler(adminController.getAuditLogs));

// Company settings & Subscription Plans
router.patch('/settings', asyncHandler(adminController.updateCompanySettings));
router.get('/subscription', asyncHandler(adminController.getSubscriptionInfo));
router.post('/subscription/upgrade', asyncHandler(adminController.upgradePlan));

// Multi-tenant organization routes
router.get('/tenants', asyncHandler(adminController.getAllTenants));
router.post('/tenants', asyncHandler(adminController.createTenant));
router.patch('/tenants/:id', asyncHandler(adminController.updateTenant));

module.exports = router;

