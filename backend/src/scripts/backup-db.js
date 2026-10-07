/**
 * Automated Database Backup Utility
 * Exports all CRM collections from MongoDB Atlas into timestamped JSON files.
 */

const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB, isDbConnected } = require('../config/db');
const models = require('../models');
const { dataStore } = require('../repositories/dataStore');

const runBackup = async () => {
  console.log('📦 Starting CRM Database Backup Process...');
  const connected = await connectDB();

  const backupDir = path.join(__dirname, '../../backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionDir = path.join(backupDir, `backup_${timestamp}`);

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const collections = [
    { name: 'users', model: models.User, fallback: dataStore.users },
    { name: 'leads', model: models.Lead, fallback: dataStore.leads },
    { name: 'tasks', model: models.Task, fallback: dataStore.tasks },
    { name: 'followUps', model: models.FollowUp, fallback: dataStore.followUps },
    { name: 'activities', model: models.Activity, fallback: dataStore.activities },
    { name: 'myDays', model: models.MyDay, fallback: dataStore.myDays },
    { name: 'outreach', model: models.Outreach, fallback: dataStore.outreach },
    { name: 'company', model: models.Company, fallback: [dataStore.company] },
    { name: 'auditLogs', model: models.AuditLog, fallback: dataStore.auditLogs },
  ];

  const summary = {};

  for (const col of collections) {
    let data = [];
    if (connected && col.model) {
      try {
        data = await col.model.find().lean();
      } catch (err) {
        console.warn(`Failed reading ${col.name} from MongoDB, using memory fallback:`, err.message);
        data = col.fallback || [];
      }
    } else {
      data = col.fallback || [];
    }

    const filePath = path.join(sessionDir, `${col.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    summary[col.name] = data.length;
    console.log(`✅ Backed up ${data.length.toString().padStart(4, ' ')} records -> ${col.name}.json`);
  }

  // Write master metadata
  const meta = {
    timestamp: new Date().toISOString(),
    source: connected ? 'MongoDB Atlas' : 'In-Memory Store',
    counts: summary,
  };
  fs.writeFileSync(path.join(sessionDir, '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  fs.writeFileSync(path.join(backupDir, 'latest.json'), JSON.stringify(meta, null, 2), 'utf-8');

  console.log(`\n🎉 Backup successfully completed at: ${sessionDir}`);
  await disconnectDB();
  process.exit(0);
};

runBackup().catch((err) => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
