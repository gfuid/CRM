const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, requireOwner, requirePermission, authenticatePlatform } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');

const auth = require('../controllers/auth.controller');
const leads = require('../controllers/leads.controller');
const tasks = require('../controllers/tasks.controller');
const reports = require('../controllers/reports.controller');
const team = require('../controllers/team.controller');
const company = require('../controllers/company.controller');
const notifications = require('../controllers/notifications.controller');
const platform = require('../controllers/platform.controller');
const { getPlatformSettings } = require('../services/billing');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();
const h = asyncHandler;

// ── Public ─────────────────────────────────────────────────────
router.get('/public/pricing', h(async (req, res) => {
  const s = await getPlatformSettings();
  return ApiResponse.success(res, { free_seats: s.free_seats, price_per_seat_monthly: s.price_per_seat_monthly, currency: s.currency });
}));

router.post('/auth/register', authLimiter, h(auth.register));
router.post('/auth/login', authLimiter, h(auth.login));
router.post('/auth/admin-login', authLimiter, h(auth.adminLogin));

// ── Platform admin console (separate token type) ───────────────
const p = express.Router();
p.use(authenticatePlatform);
p.get('/overview', h(platform.getOverview));
p.get('/companies', h(platform.listCompanies));
p.get('/companies/:id', h(platform.getCompany));
p.patch('/companies/:id', h(platform.updateCompany));
p.post('/companies/:id/payments', h(platform.recordPayment));
p.get('/notifications', h(platform.listNotifications));
p.post('/notifications', h(platform.sendNotification));
p.post('/notifications/expiring', h(platform.remindExpiring));
p.get('/users', h(platform.listUsers));
p.patch('/users/:id', h(platform.updateUser));
p.get('/settings', h(platform.getSettings));
p.patch('/settings', h(platform.updateSettings));
p.get('/health', h(platform.getHealth));
router.use('/platform', p);

// ── Everything below needs a signed-in company user ────────────
router.use(authenticate);

router.get('/auth/me', h(auth.getProfile));
router.patch('/auth/profile', h(auth.updateProfile));
router.post('/auth/logout-all', h(auth.logoutAll));

// Leads (static paths before /:id)
router.get('/leads/export', requirePermission('leads_export', 'You do not have permission to export leads'), h(leads.exportLeads));
router.post('/leads/import', requirePermission('leads_import', 'You do not have permission to import leads'), h(leads.importLeads));
router.get('/leads/trash', requireOwner, h(leads.getTrash));
router.get('/leads', h(leads.getLeads));
router.post('/leads', requirePermission('leads_create', 'You do not have permission to add leads'), h(leads.createLead));
router.get('/leads/:id', h(leads.getLeadById));
router.patch('/leads/:id', h(leads.updateLead));
router.delete('/leads/:id', h(leads.deleteLead));
router.post('/leads/:id/activities', h(leads.logLeadActivity));
router.post('/leads/:id/restore', requireOwner, h(leads.restoreLead));
router.delete('/leads/:id/purge', requireOwner, h(leads.purgeLead));

// Tasks
router.get('/tasks', h(tasks.getTasks));
router.post('/tasks', h(tasks.createTask));
router.patch('/tasks/:id', h(tasks.updateTask));
router.delete('/tasks/:id', h(tasks.deleteTask));

// Reports (all derived from leads, tasks and the activity log)
router.get('/activity', h(reports.getActivityFeed));
router.get('/reports/today', h(reports.getToday));
router.get('/reports/daily', h(reports.getDailyReport));
router.get('/reports/outreach', h(reports.getOutreachReport));
router.get('/analytics', h(reports.getAnalytics));

// Company
router.get('/company', h(company.getCompany));
router.get('/company/members', h(company.getMembers));
router.patch('/company', requireOwner, h(company.updateCompany));
router.post('/company/lists/:list', h(company.addListItem));

// Team (owner only)
router.get('/team', requireOwner, h(team.listTeam));
router.post('/team', requireOwner, h(team.createMember));
router.get('/team/audit-log', requireOwner, h(team.getAuditLog));
router.patch('/team/:id', requireOwner, h(team.updateMember));
router.post('/team/:id/deactivate', requireOwner, h(team.deactivateMember));
router.post('/team/:id/activate', requireOwner, h(team.activateMember));
router.post('/team/:id/reset-password', requireOwner, h(team.resetMemberPassword));

// Notifications
router.get('/notifications', h(notifications.listNotifications));
router.post('/notifications/read-all', h(notifications.readAll));
router.post('/notifications/:id/read', h(notifications.readOne));

module.exports = router;
