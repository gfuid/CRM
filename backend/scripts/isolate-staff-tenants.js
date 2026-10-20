/**
 * Migration Script: Strictly isolate all owners and staff by tenant/company_id
 * Run: node backend/scripts/isolate-staff-tenants.js
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const snapshotPath = path.join(__dirname, '../backups/active_db_snapshot.json');

async function migrate() {
  console.log('🔄 Starting tenant & staff isolation migration...');

  if (!fs.existsSync(snapshotPath)) {
    console.error('Snapshot not found at', snapshotPath);
    return;
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  const users = snapshot.users || [];

  // 1. Defined owner to company mapping
  const ownerCompanyMap = {
    'usr_1789924957033_xthwzi': { company_id: 'comp_punia_1789924957033', company_name: "punia's Workspace" },
    'usr_1790485912422_52s5fh': { company_id: 'comp_sagar_1790485912422', company_name: "sagar's Workspace" },
    'usr_1790497494307_dcds9e': { company_id: 'comp_testowner_1790497494307', company_name: "Travel-Trade" },
    'usr_1791306043083_9p353t': { company_id: 'comp_sagarpunia_1791306043083', company_name: "sagarpunia's Workspace" },
    'usr_1791308692781_zo9rj5': { company_id: 'comp_ambani_1791308692781', company_name: "ambani's Workspace" },
    'usr_1791460149959_h6fqui': { company_id: 'comp_athish_1791460149959', company_name: "Athish Ravikanth's Workspace" },
    'usr_1791814360788_t8vbux': { company_id: 'comp_sunil_1791814360788', company_name: "Ambavi International" },
    'usr_1791814468302_hoa08z': { company_id: 'comp_bioniversio_1', company_name: "Bioniversio Biologics" },
    'usr_1791906296111_uweyz8': { company_id: 'comp_binti_1791906296111', company_name: "binti's Workspace" },
    'usr_1791988353309_kln9hb': { company_id: 'comp_1791988353309_h1djru', company_name: "soch's Workspace" },
  };

  // Explicit staff mapping
  const staffOwnerMap = {
    // Sagar Punia & Rahul -> Keerthana Ponni K
    'usr_1789929063747_allpa4': { created_by: 'usr_1791814468302_hoa08z', company_id: 'comp_bioniversio_1', company_name: 'Bioniversio Biologics' },
    'sagarpunia163@gmail.com': { created_by: 'usr_1791814468302_hoa08z', company_id: 'comp_bioniversio_1', company_name: 'Bioniversio Biologics' },
    'usr_1792001466336_wwykxg': { created_by: 'usr_1791814468302_hoa08z', company_id: 'comp_bioniversio_1', company_name: 'Bioniversio Biologics' },
    'rahul@gmail.com': { created_by: 'usr_1791814468302_hoa08z', company_id: 'comp_bioniversio_1', company_name: 'Bioniversio Biologics' },

    // papu -> sagarpunia (usr_1791306043083_9p353t)
    'usr_1791306183682_rh51dw': { created_by: 'usr_1791306043083_9p353t', company_id: 'comp_sagarpunia_1791306043083', company_name: "sagarpunia's Workspace" },
    'papu@gmail.com': { created_by: 'usr_1791306043083_9p353t', company_id: 'comp_sagarpunia_1791306043083', company_name: "sagarpunia's Workspace" },

    // sahil & xyzzzzzz -> ambani (usr_1791308692781_zo9rj5)
    'usr_1791309008897_voir4i': { created_by: 'usr_1791308692781_zo9rj5', company_id: 'comp_ambani_1791308692781', company_name: "ambani's Workspace" },
    'sahil@gmail.com': { created_by: 'usr_1791308692781_zo9rj5', company_id: 'comp_ambani_1791308692781', company_name: "ambani's Workspace" },
    'usr_1791372966148_kt8sua': { created_by: 'usr_1791308692781_zo9rj5', company_id: 'comp_ambani_1791308692781', company_name: "ambani's Workspace" },
    'sa@gmail.com': { created_by: 'usr_1791308692781_zo9rj5', company_id: 'comp_ambani_1791308692781', company_name: "ambani's Workspace" },

    // Ramesh -> sagar (usr_1790485912422_52s5fh)
    'usr_1791459430052_bmpz72': { created_by: 'usr_1790485912422_52s5fh', company_id: 'comp_sagar_1790485912422', company_name: "sagar's Workspace" },
    'sagarpunia@gmail.com': { created_by: 'usr_1790485912422_52s5fh', company_id: 'comp_sagar_1790485912422', company_name: "sagar's Workspace" },

    // Sagar -> Athish Ravikanth
    'usr_1791460244556_5226eo': { created_by: 'usr_1791460149959_h6fqui', company_id: 'comp_athish_1791460149959', company_name: "Athish Ravikanth's Workspace" },
    'sagarpunia789@gmail.com': { created_by: 'usr_1791460149959_h6fqui', company_id: 'comp_athish_1791460149959', company_name: "Athish Ravikanth's Workspace" },

    // deepak & vasu -> soch (usr_1791988353309_kln9hb)
    'usr_1791993470575_8mv3oh': { created_by: 'usr_1791988353309_kln9hb', company_id: 'comp_1791988353309_h1djru', company_name: "soch's Workspace" },
    'deepak@gmail.com': { created_by: 'usr_1791988353309_kln9hb', company_id: 'comp_1791988353309_h1djru', company_name: "soch's Workspace" },
    'usr_1791995214954_dldsfy': { created_by: 'usr_1791988353309_kln9hb', company_id: 'comp_1791988353309_h1djru', company_name: "soch's Workspace" },
    'vasu@gmail.com': { created_by: 'usr_1791988353309_kln9hb', company_id: 'comp_1791988353309_h1djru', company_name: "soch's Workspace" },
  };

  // 2. Update owners
  for (const u of users) {
    const isOwner = u.persona === 'owner' || u.role === 'admin';
    if (isOwner) {
      if (ownerCompanyMap[u.id]) {
        u.company_id = ownerCompanyMap[u.id].company_id;
        u.company_name = ownerCompanyMap[u.id].company_name;
      } else if (!u.company_id || u.company_id === 'comp_1' || u.company_id === 'comp_traveltrade_1') {
        u.company_id = 'comp_' + u.id;
        u.company_name = u.company_name || `${u.name}'s Workspace`;
      }
      u.persona = 'owner';
      u.role = 'admin';
    } else {
      // Staff member
      u.persona = 'staff';
      u.role = u.role === 'admin' ? 'agent' : (u.role || 'agent');

      // Check explicit mapping
      const explicit = staffOwnerMap[u.id] || staffOwnerMap[u.email?.toLowerCase()];
      if (explicit) {
        u.created_by = explicit.created_by;
        u.company_id = explicit.company_id;
        u.company_name = explicit.company_name;
      } else if (u.created_by) {
        // If created_by is set, find owner
        const owner = users.find((o) => o.id === u.created_by || o.email?.toLowerCase() === u.created_by?.toLowerCase());
        if (owner && owner.company_id) {
          u.company_id = owner.company_id;
          u.company_name = owner.company_name;
        }
      }
    }
  }

  // 3. Write back snapshot
  snapshot.users = users;
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log('✅ Snapshot successfully updated with isolated tenants!');

  // 4. Update MongoDB Atlas if connected
  if (process.env.MONGODB_URI) {
    try {
      console.log('🔌 Connecting to MongoDB Atlas...');
      await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'crm' });
      console.log('Connected to MongoDB Atlas');

      const col = mongoose.connection.db.collection('users');
      for (const u of users) {
        const query = u.id ? { $or: [{ id: u.id }, { email: u.email }] } : { email: u.email };
        await col.updateOne(
          query,
          {
            $set: {
              company_id: u.company_id,
              company_name: u.company_name,
              created_by: u.created_by || '',
              persona: u.persona,
              role: u.role,
            },
          }
        );
      }
      console.log('✅ MongoDB users updated with isolated company IDs!');
    } catch (e) {
      console.warn('⚠️ MongoDB sync warning:', e.message);
    } finally {
      await mongoose.disconnect();
    }
  }

  console.log('🎉 Migration completed successfully!');
}

migrate().catch(console.error);
