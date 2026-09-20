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
    if (userCount === 0) {
      console.log('🌱 Empty MongoDB database detected. Seeding initial CRM collections with secure authentication credentials...');

      // Prepare users with hashed passwords
      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash('admin123', salt);
      const agentHash = await bcrypt.hash('agent123', salt);

      const usersToSeed = dataStore.users.map((u) => ({
        ...u,
        password: u.role === 'admin' ? defaultHash : agentHash,
      }));

      // Seed Users
      await models.User.insertMany(usersToSeed);

      // Seed Company
      if (dataStore.company) {
        await models.Company.create(dataStore.company);
      }

      // Seed Leads
      if (dataStore.leads && dataStore.leads.length > 0) {
        await models.Lead.insertMany(dataStore.leads);
      }

      // Seed Tasks
      if (dataStore.tasks && dataStore.tasks.length > 0) {
        await models.Task.insertMany(dataStore.tasks);
      }

      // Seed Activities
      if (dataStore.activities && dataStore.activities.length > 0) {
        await models.Activity.insertMany(dataStore.activities);
      }

      // Seed FollowUps
      if (dataStore.followUps && dataStore.followUps.length > 0) {
        await models.FollowUp.insertMany(dataStore.followUps);
      }

      // Seed MyDays
      if (dataStore.myDays && dataStore.myDays.length > 0) {
        await models.MyDay.insertMany(dataStore.myDays);
      }

      // Seed Outreach
      if (dataStore.outreach && dataStore.outreach.length > 0) {
        await models.Outreach.insertMany(dataStore.outreach);
      }

      // Seed AuditLogs
      if (dataStore.auditLogs && dataStore.auditLogs.length > 0) {
        await models.AuditLog.insertMany(dataStore.auditLogs);
      }

      console.log('✅ Initial CRM datasets successfully seeded to MongoDB Atlas!');
    } else {
      console.log(`📦 MongoDB already contains ${userCount} users. Hydrating latest state...`);
    }

    // Always synchronize dataStore with MongoDB after connecting
    await syncFromDB();
  } catch (error) {
    console.error('⚠️  Error seeding MongoDB:', error.message);
  }
};

module.exports = {
  seedMongoDB,
  syncFromDB,
};
