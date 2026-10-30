/**
 * Touch the MongoDB database once (one small write + one read).
 * Run by .github/workflows/db-heartbeat.yml every few days, so the free Atlas cluster is never
 * paused for inactivity (Atlas pauses free clusters after 30 days without activity), even if the
 * backend itself is down.
 *
 *   MONGODB_URI=... node src/scripts/db-heartbeat.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  const now = new Date();
  await db.collection('appsettings').updateOne(
    { id: 'db_heartbeat_github' },
    { $set: { id: 'db_heartbeat_github', last_at: now.toISOString() }, $inc: { count: 1 } },
    { upsert: true }
  );
  const leads = await db.collection('leads').estimatedDocumentCount();
  console.log(`Heartbeat OK at ${now.toISOString()} (database ${db.databaseName}, ${leads} leads)`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Heartbeat FAILED:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
