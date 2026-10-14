const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  console.log('Connected to MongoDB');

  // 1. Assign unique company_id to binti
  const bintiRes = await mongoose.connection.db.collection('users').updateOne(
    { email: 'binti@gmail.com' },
    { $set: { company_id: 'comp_binti_1791906296111' } }
  );
  console.log('Updated binti user:', bintiRes.modifiedCount);

  // 2. Fix Keerthana's lead (Hybro Traders)
  const hybroRes = await mongoose.connection.db.collection('leads').updateOne(
    { name: 'Hybro Traders Pvt Limited' },
    { $set: { company_id: 'comp_keerthana_1791814468302', owner_id: 'usr_1791814468302_hoa08z' } }
  );
  console.log('Updated Hybro lead:', hybroRes.modifiedCount);

  // 3. Fix Sunil's leads (Fortune Agro & E1 Air)
  const sunilRes = await mongoose.connection.db.collection('leads').updateMany(
    { created_by_id: 'usr_1791814360788_t8vbux' },
    { $set: { company_id: 'comp_sunil_1791814360788', owner_id: 'usr_1791814360788_t8vbux' } }
  );
  console.log('Updated Sunil leads:', sunilRes.modifiedCount);

  // 4. Fix early demo/test leads (cxcs, dfasf, payal, xuyz, Amir)
  const testRes = await mongoose.connection.db.collection('leads').updateMany(
    { company_id: { $in: ['', null] } },
    { $set: { company_id: 'comp_traveltrade_1', owner_id: 'usr_1789924957033_xthwzi' } }
  );
  console.log('Updated remaining leads:', testRes.modifiedCount);

  // 5. Ensure all existing owners have a company_id
  const owners = await mongoose.connection.db.collection('users').find({ persona: 'owner', company_id: { $in: ['', null] } }).toArray();
  for (const o of owners) {
    await mongoose.connection.db.collection('users').updateOne({ _id: o._id }, { $set: { company_id: 'comp_' + o.id } });
    console.log('Set company_id for owner:', o.name, 'comp_' + o.id);
  }

  console.log('Migration complete!');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
