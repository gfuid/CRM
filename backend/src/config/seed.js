const bcrypt = require('bcryptjs');
const models = require('../models');
const { dataStore } = require('../repositories/dataStore');

/**
 * Hydrate in-memory dataStore from MongoDB Atlas
 */
const syncFromDB = async () => {
  try {
    const [users, company, leads, tasks, activities, followUps, myDays, outreach, auditLogs] =
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
      ]);

    if (users && users.length > 0) dataStore.users = users;
    if (company) dataStore.company = company;
    if (leads && leads.length > 0) dataStore.leads = leads;
    if (tasks && tasks.length > 0) dataStore.tasks = tasks;
    if (activities && activities.length > 0) dataStore.activities = activities;
    if (followUps && followUps.length > 0) dataStore.followUps = followUps;
    if (myDays && myDays.length > 0) dataStore.myDays = myDays;
    if (outreach && outreach.length > 0) dataStore.outreach = outreach;
    if (auditLogs && auditLogs.length > 0) dataStore.auditLogs = auditLogs;

    console.log(
      `🔄 In-memory cache successfully synchronized with MongoDB Atlas (${leads.length} leads, ${users.length} users, ${tasks.length} tasks).`
    );
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
};
