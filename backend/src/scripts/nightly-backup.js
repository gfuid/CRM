/**
 * Nightly backup of the whole MongoDB database.
 *
 * Every collection is saved as Extended JSON (keeps dates and ids exactly), plus a _meta.json with counts.
 * Unlike backup-db.js it never falls back to in-memory data: if MongoDB cannot be reached the backup FAILS
 * loudly, so an empty "successful" backup can never happen.
 *
 *   MONGODB_URI=... node src/scripts/nightly-backup.js [outputDir]
 *
 * Restore one backup folder:   MONGODB_URI=... node src/scripts/restore-nightly.js <folder> [--apply]
 * Used by .github/workflows/nightly-backup.yml (runs every night, encrypted, kept 30 days).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { EJSON } = mongoose.mongo.BSON;

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Backup aborted.');
    process.exit(1);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(process.argv[2] || path.join(__dirname, '../../backups/nightly', `backup_${stamp}`));
  fs.mkdirSync(outDir, { recursive: true });

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.'))
    .sort();

  const counts = {};
  let totalBytes = 0;
  for (const name of collections) {
    const docs = await db.collection(name).find({}).toArray();
    const text = EJSON.stringify(docs, { relaxed: false });
    fs.writeFileSync(path.join(outDir, `${name}.json`), text, 'utf-8');
    counts[name] = docs.length;
    totalBytes += Buffer.byteLength(text);
    console.log(`saved ${String(docs.length).padStart(6)}  ${name}`);
  }

  if (!collections.length || !counts.users) {
    console.error('Backup looks empty (no users). Something is wrong with the connection or database name.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const meta = {
    created_at: new Date().toISOString(),
    database: db.databaseName,
    collections: counts,
    total_mb: Number((totalBytes / 1024 / 1024).toFixed(2)),
  };
  fs.writeFileSync(path.join(outDir, '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  console.log(`\nBackup complete: ${outDir} (${meta.total_mb} MB)`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Backup FAILED:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
