/**
 * Removes ONLY the old built-in demo records from MongoDB.
 *
 * It deletes records whose id is one of the fixed demo ids (lead_1..lead_5, tsk_1..tsk_3, act_1, act_2,
 * out_1, day_1..day_3, flw_1..flw_3, log_1..log_3). Real customer data uses long generated ids
 * (e.g. lead_1791..._abc123) and is never matched. Bioniversio Biologics and Ambavi International
 * records are never matched because their ids are generated, not fixed.
 *
 * Dry run (default, shows what would be deleted):   node scripts/remove-demo-data.js
 * Really delete:                                    node scripts/remove-demo-data.js --apply
 */
require('dotenv').config();
const mongoose = require('mongoose');
const models = require('../src/models');
const { DEMO_RECORD_IDS } = require('../src/repositories/dataStore');

const APPLY = process.argv.includes('--apply');
const COLLECTIONS = ['Lead', 'Task', 'Activity', 'Outreach', 'MyDay', 'FollowUp', 'AuditLog'];

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Nothing to do.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const ids = [...DEMO_RECORD_IDS];
  let total = 0;
  for (const name of COLLECTIONS) {
    const Model = models[name];
    const found = await Model.find({ id: { $in: ids } }).lean();
    total += found.length;
    for (const doc of found) {
      console.log(`${APPLY ? 'DELETE' : 'would delete'}  ${name.padEnd(9)} ${doc.id}  ${doc.name || doc.title || doc.task || doc.client_name || doc.action || ''}`);
    }
    if (APPLY && found.length) {
      await Model.deleteMany({ id: { $in: found.map((d) => d.id) } });
    }
  }
  console.log(`\n${total} demo record(s) ${APPLY ? 'deleted' : 'found (dry run, nothing deleted; add --apply to delete)'}.`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Failed:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
