const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const analyticsRoutes = require('./analytics.routes');
const leadsRoutes = require('./leads.routes');
const tasksRoutes = require('./tasks.routes');
const activityRoutes = require('./activity.routes');
const outreachRoutes = require('./outreach.routes');
const myDaysRoutes = require('./myDays.routes');
const followUpRoutes = require('./followUp.routes');

// Mount routes with clean v1 namespace
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/leads', leadsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/activity', activityRoutes);
router.use('/outreach', outreachRoutes);
router.use('/mydays', myDaysRoutes);
router.use('/followup', followUpRoutes);

module.exports = router;
