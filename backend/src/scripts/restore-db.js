/**
 * Automated Database Restore Utility
 * Restores collections into MongoDB Atlas from a specified JSON backup directory.
 */

const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../config/db');
const models = require('../models');

const runRestore = async () => {
  const targetDirName = process.argv[2];
  const backupsDir = path.join(__dirname, '../../backups');

  let sessionDir = '';
  if (targetDirName) {
    sessionDir = path.join(backupsDir, targetDirName);
  } else {
    // Find latest backup directory
    if (!fs.existsSync(backupsDir)) {
      console.error('❌ No backups directory found at:', backupsDir);
      process.exit(1);
    }
    const dirs = fs.readdirSync(backupsDir).filter((d) => d.startsWith('backup_')).sort();
    if (dirs.length === 0) {
      console.error('❌ No backup snapshots found in:', backupsDir);
      process.exit(1);
    }
    sessionDir = path.join(backupsDir, dirs[dirs.length - 1]);
  }

  console.log(`📦 Restoring CRM Database from snapshot: ${sessionDir}`);
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Cannot restore: MongoDB Atlas connection failed.');
    process.exit(1);
  }

  const collections = [
    { name: 'users', model: models.User, idKey: 'id' },
    { name: 'leads', model: models.Lead, idKey: 'id' },
    { name: 'tasks', model: models.Task, idKey: 'id' },
    { name: 'followUps', model: models.FollowUp, idKey: 'id' },
    { name: 'activities', model: models.Activity, idKey: 'id' },
    { name: 'myDays', model: models.MyDay, idKey: 'id' },
    { name: 'outreach', model: models.Outreach, idKey: 'id' },
    { name: 'auditLogs', model: models.AuditLog, idKey: 'id' },
  ];

  for (const col of collections) {
    const file = path.join(sessionDir, `${col.name}.json`);
    if (fs.existsSync(file)) {
      const records = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(records) && records.length > 0) {
        let restoredCount = 0;
        for (const item of records) {
          const toSave = { ...item };
          delete toSave._id;
          const query = item[col.idKey] ? { [col.idKey]: item[col.idKey] } : {};
          if (Object.keys(query).length > 0) {
            await col.model.findOneAndUpdate(query, toSave, { upsert: true });
            restoredCount++;
          }
        }
        console.log(`✅ Restored ${restoredCount} records -> ${col.name}`);
      }
    }
  }

  console.log('\n🎉 Database restore operation successfully completed!');
  await disconnectDB();
  process.exit(0);
};

runRestore().catch((err) => {
  console.error('❌ Restore failed:', err);
  process.exit(1);
});
