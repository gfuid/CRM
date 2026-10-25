/**
 * Restore a nightly backup folder (made by nightly-backup.js) into MongoDB.
 *
 * Dry run first (default) - shows what would be written:
 *   MONGODB_URI=... node src/scripts/restore-nightly.js ./backup_2026-10-26T21-00-00-000Z
 * Really restore (records are upserted by _id; nothing that is not in the backup is deleted):
 *   MONGODB_URI=... node src/scripts/restore-nightly.js ./backup_2026-10-26T21-00-00-000Z --apply
 * Restore only some collections:
 *   ... --apply --only=leads,tasks
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { EJSON } = mongoose.mongo.BSON;

(async () => {
  const dir = process.argv[2];
  const apply = process.argv.includes('--apply');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',').map((s) => s.trim()).filter(Boolean) : null;
  if (!dir || !fs.existsSync(path.join(dir, '_meta.json'))) {
    console.error('Give the backup folder (it must contain _meta.json).');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }
  const meta = JSON.parse(fs.readFileSync(path.join(dir, '_meta.json'), 'utf-8'));
  console.log(`Backup from ${meta.created_at} (database ${meta.database})${apply ? '' : '  [DRY RUN]'}`);

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== '_meta.json').sort()) {
    const name = file.replace(/\.json$/, '');
    if (only && !only.includes(name)) continue;
    const docs = EJSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    if (!Array.isArray(docs) || !docs.length) continue;
    if (apply) {
      const ops = docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } }));
      for (let i = 0; i < ops.length; i += 500) {
        await db.collection(name).bulkWrite(ops.slice(i, i + 500), { ordered: false });
      }
    }
    console.log(`${apply ? 'restored' : 'would restore'} ${String(docs.length).padStart(6)}  ${name}`);
  }
  await mongoose.disconnect();
  console.log(apply ? '\nRestore complete. Restart the backend so it reloads the data.' : '\nDry run only. Add --apply to really restore.');
})().catch(async (err) => {
  console.error('Restore FAILED:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
