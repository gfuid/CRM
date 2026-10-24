const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const models = require('../models');
const { dataStore, withoutDemo } = require('../repositories/dataStore');

const snapshotPath = path.join(__dirname, '../../backups/active_db_snapshot.json');

/**
 * Hydrate dataStore from local snapshot file if present
 */
const hydrateFromSnapshot = () => {
  try {
    if (fs.existsSync(snapshotPath)) {
      const raw = fs.readFileSync(snapshotPath, 'utf-8');
      const snapshot = JSON.parse(raw);
      if (snapshot.users && snapshot.users.length > 0) dataStore.users = snapshot.users;
      if (snapshot.company) dataStore.company = snapshot.company;
      if (snapshot.leads && snapshot.leads.length > 0) dataStore.leads = snapshot.leads;
      if (snapshot.tasks && snapshot.tasks.length > 0) dataStore.tasks = snapshot.tasks;
      if (snapshot.activities && snapshot.activities.length > 0) dataStore.activities = snapshot.activities;
      if (snapshot.followUps && snapshot.followUps.length > 0) dataStore.followUps = snapshot.followUps;
      if (snapshot.myDays && snapshot.myDays.length > 0) dataStore.myDays = snapshot.myDays;
      if (snapshot.outreach && snapshot.outreach.length > 0) dataStore.outreach = snapshot.outreach;
      if (snapshot.auditLogs && snapshot.auditLogs.length > 0) dataStore.auditLogs = snapshot.auditLogs;
      if (snapshot.emailSettings && snapshot.emailSettings.length > 0) dataStore.emailSettings = snapshot.emailSettings;
      if (snapshot.emailCampaigns && snapshot.emailCampaigns.length > 0) dataStore.emailCampaigns = snapshot.emailCampaigns;
      console.log(`⚡ Instant local snapshot hydrated (${(snapshot.leads || []).length} leads, ${(snapshot.users || []).length} users)`);
      return true;
    }
  } catch (err) {
    console.warn('⚠️  Could not hydrate from local snapshot:', err.message);
  }
  return false;
};

/**
 * Hydrate in-memory dataStore from MongoDB Atlas & write snapshot
 */
const syncFromDB = async () => {
  try {
    const [users, company, leads, tasks, activities, followUps, myDays, outreach, auditLogs, emailSettings, emailCampaigns, notifications] =
      await Promise.all([
        models.User.find().lean(),
        models.Company.findOne().lean(),
        models.Lead.find().lean(),
        models.Task.find().lean(),
        models.Activity.find().lean(),
        models.FollowUp.find().lean(),
        models.MyDay.find().lean(),
        models.Outreach.find().lean(),
        models.AuditLog.find().lean(),
        models.EmailSetting.find().lean(),
        models.EmailCampaign.find().lean(),
        models.Notification ? models.Notification.find().lean() : Promise.resolve([]),
      ]);

    if (users && users.length > 0) {
      dataStore.users = users;
      try {
        const { enforceTenantIsolation } = require('../utils/tenantScope');
        enforceTenantIsolation(dataStore.users);
      } catch (e) {}
    }
    if (company) dataStore.company = company;
    if (leads && leads.length > 0) dataStore.leads = withoutDemo(leads);
    if (tasks && tasks.length > 0) dataStore.tasks = withoutDemo(tasks);
    if (activities && activities.length > 0) dataStore.activities = withoutDemo(activities);
    if (followUps && followUps.length > 0) dataStore.followUps = withoutDemo(followUps);
    if (myDays && myDays.length > 0) dataStore.myDays = withoutDemo(myDays);
    if (outreach && outreach.length > 0) dataStore.outreach = withoutDemo(outreach);
    if (auditLogs && auditLogs.length > 0) dataStore.auditLogs = withoutDemo(auditLogs);
    if (notifications && notifications.length > 0) dataStore.notifications = notifications;
    // A campaign cannot still be sending right after a restart: mark it paused so it can be resumed
    (dataStore.emailCampaigns || []).forEach((c) => {
      if (c.status === 'sending') {
        c.status = 'paused';
        c.error = 'Sending was interrupted by a server restart. Press Send to resume the remaining recipients.';
      }
    });
    if (emailSettings && emailSettings.length > 0) dataStore.emailSettings = emailSettings;
    if (emailCampaigns && emailCampaigns.length > 0) dataStore.emailCampaigns = emailCampaigns;

    console.log(
      `🔄 In-memory cache successfully synchronized with MongoDB Atlas (${leads.length} leads, ${users.length} users, ${tasks.length} tasks).`
    );

    // Save snapshot to disk asynchronously to prevent any data loss
    try {
      const backupDir = path.dirname(snapshotPath);
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const snapshot = {
        users: dataStore.users,
        leads: dataStore.leads,
        tasks: dataStore.tasks,
        activities: dataStore.activities,
        followUps: dataStore.followUps,
        myDays: dataStore.myDays,
        outreach: dataStore.outreach,
        auditLogs: dataStore.auditLogs,
        company: dataStore.company,
        timestamp: new Date().toISOString(),
      };
      fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), (err) => {
        if (err) console.warn('Failed writing local snapshot:', err.message);
      });
    } catch (e) {}
  } catch (err) {
    console.error('⚠️  Failed to sync from MongoDB:', err.message);
  }
};

/**
 * Seed initial datasets into MongoDB if empty
 */
const seedMongoDB = async () => {
  try {
    const userCount = await models.User.countDocuments();
    console.log(`📦 MongoDB connected with ${userCount} registered users.`);
    // Synchronize in-memory cache with MongoDB Atlas
    await syncFromDB();
  } catch (error) {
    console.error('⚠️  Error initializing DB sync:', error.message);
  }
};

module.exports = {
  seedMongoDB,
  syncFromDB,
  hydrateFromSnapshot,
};
