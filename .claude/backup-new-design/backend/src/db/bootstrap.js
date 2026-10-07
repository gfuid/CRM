/**
 * Startup: pick the storage driver, migrate accounts from the old single-company layout
 * (once), and make sure the demo company exists.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { store } = require('./store');
const { newId, nowIso } = require('./tenant');
const { createCompanyWithOwner, avatarFor } = require('../services/companies');

const DEMO_COMPANY_ID = 'comp_demo';
const LEGACY_MIGRATION_ID = 'legacy_migration_v2';
const DAY_MS = 86400000;

const connect = async () => {
  if (!config.mongodbUri) {
    store.useMemory();
    console.warn('MONGODB_URI is not set: using in-memory storage (data is lost on restart).');
    return false;
  }
  // Same database the previous version used (taken from the URI), so existing accounts are found
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  await store.useMongo();
  console.log('Connected to MongoDB.');
  return true;
};

const legacyCollection = (name) => mongoose.connection.db.collection(name);

const isLegacyOwner = (u) => u.persona === 'owner' || u.role === 'admin';

/**
 * The old app kept every company's data in one shared pool, and its schemas dropped
 * company and creator fields, so old records can't be traced back to a company.
 * Owners get their own fresh company (keeping their password); staff and old shared
 * records go to the demo company, deactivated, for the platform admin to sort out.
 * Old collections are left untouched as a backup.
 */
const migrateLegacy = async () => {
  if (store.kind !== 'mongo') return;
  if (await store.findOne('meta', { id: LEGACY_MIGRATION_ID })) return;

  const legacyUsers = await legacyCollection('users').find({}).toArray();
  const report = { owners: 0, orphan_staff: 0, leads: 0, tasks: 0, activities: 0 };

  for (const u of legacyUsers) {
    const email = String(u.email || '').toLowerCase().trim();
    if (!email || email === config.demoOwnerEmail) continue;
    if (await store.findOne('users', { email })) continue;

    if (isLegacyOwner(u)) {
      await createCompanyWithOwner({
        companyName: `${u.name || 'My'}'s Company`,
        ownerName: u.name || email,
        email,
        passwordHash: u.password || '',
        phone: u.phone || '',
        ownerId: u.id || undefined,
      });
      report.owners += 1;
    } else {
      await store.insertOne('users', {
        id: u.id || newId('usr'),
        company_id: DEMO_COMPANY_ID,
        name: u.name || email,
        email,
        password: u.password || '',
        role: u.role === 'manager' ? 'manager' : 'agent',
        phone: u.phone || '',
        designation: '',
        department: u.department || 'Sales',
        is_active: false,
        legacy_orphan: true,
        avatar_url: u.avatar_url || avatarFor(u.name || email),
        permissions: {},
        token_version: 0,
        last_login: u.last_login ? new Date(u.last_login).toISOString() : null,
        created_at: u.created_at ? new Date(u.created_at).toISOString() : nowIso(),
        updated_at: nowIso(),
      });
      report.orphan_staff += 1;
    }
  }

  const copyInto = async (legacyName, col, mapDoc) => {
    const rows = await legacyCollection(legacyName).find({}).toArray();
    for (const r of rows) {
      const { _id, __v, createdAt, updatedAt, ...rest } = r;
      const doc = mapDoc({ ...rest, id: rest.id || newId(col) });
      if (await store.findOne(col, { id: doc.id })) continue;
      await store.insertOne(col, { ...doc, company_id: DEMO_COMPANY_ID, legacy: true });
      report[col] += 1;
    }
  };
  const iso = (v) => (v ? new Date(v).toISOString() : nowIso());
  await copyInto('leads', 'leads', (l) => ({ ...l, created_at: iso(l.created_at), updated_at: iso(l.updated_at), deleted_at: null }));
  await copyInto('tasks', 'tasks', (t) => ({ ...t, due_date: String(t.due_date ? iso(t.due_date) : nowIso()).slice(0, 10), created_at: iso(t.created_at) }));
  await copyInto('activities', 'activities', (a) => ({ ...a, timestamp: iso(a.timestamp || a.created_at) }));

  await store.insertOne('meta', { id: LEGACY_MIGRATION_ID, value: { ...report, at: nowIso() } });
  console.log('Legacy data migrated:', report);
};

const shiftDateStr = (d, days) => (d ? new Date(Date.parse(d) + days * DAY_MS).toISOString().slice(0, 10) : d);
const shiftIso = (d, ms) => (d ? new Date(Date.parse(d) + ms).toISOString() : d);

const legacyDemoOwner = async () =>
  store.kind === 'mongo' ? legacyCollection('users').findOne({ email: config.demoOwnerEmail }) : null;

/** Password for the demo owner: env var, else the hash from their old account. */
const demoOwnerPasswordHash = async () => {
  if (config.demoOwnerPassword) return bcrypt.hash(config.demoOwnerPassword, 10);
  if (store.kind === 'mongo') {
    const legacy = await legacyCollection('users').findOne({ email: config.demoOwnerEmail });
    if (legacy && legacy.password) return legacy.password;
  }
  return '';
};

/** Creates the demo company (owned by the demo owner) with the sample data, once. */
const ensureDemoCompany = async () => {
  if (await store.findOne('companies', { id: DEMO_COMPANY_ID })) return;

  const existingOwner = await store.findOne('users', { email: config.demoOwnerEmail });
  if (existingOwner) {
    console.warn(`Demo owner ${config.demoOwnerEmail} already belongs to another company; skipping demo seed.`);
    return;
  }

  const passwordHash = await demoOwnerPasswordHash();
  if (!passwordHash) {
    console.warn('Demo owner has no password yet: set DEMO_OWNER_PASSWORD to enable sign-in.');
  }

  // Keep the owner's own name from their old account; the company keeps its original name
  const legacy = await legacyDemoOwner();
  const { company, owner } = await createCompanyWithOwner({
    companyId: DEMO_COMPANY_ID,
    companyName: 'Travel-Trade',
    ownerName: (legacy && legacy.name) || 'Sagar Punia',
    phone: (legacy && legacy.phone) || '',
    email: config.demoOwnerEmail,
    passwordHash,
    isDemo: true,
  });
  await store.updateOne('companies', { id: company.id }, { seats_free: 20, 'settings.currency': 'USD' });

  const demo = require('../seed/demo-data.json');

  // Move the sample timeline so its latest day is yesterday: the demo always looks current
  const latest = Math.max(...demo.activities.map((a) => Date.parse(a.timestamp)));
  const shiftDays = Math.max(0, Math.round((Date.now() - DAY_MS - latest) / DAY_MS));
  const shiftMs = shiftDays * DAY_MS;

  const now = nowIso();
  const userIdByKey = new Map();
  const members = demo.members.map((m) => {
    const id = `usr_demo_${m.key.replace(/[^a-z0-9]/g, '')}`;
    userIdByKey.set(m.key, id);
    return {
      id,
      company_id: company.id,
      name: m.name,
      email: `${m.key.replace(/[^a-z0-9]/g, '')}@demo.oneroot.local`,
      password: '',
      role: 'agent',
      phone: '',
      designation: 'Sales Executive',
      department: 'Sales',
      is_active: true,
      avatar_url: avatarFor(m.name),
      permissions: {},
      token_version: 0,
      last_login: null,
      created_by: owner.id,
      created_at: now,
      updated_at: now,
    };
  });
  await store.insertMany('users', members);
  const uid = (key) => userIdByKey.get(key) || owner.id;

  const leads = demo.leads.map(({ assignee_key, creator_key, ...l }) => ({
    ...l,
    company_id: company.id,
    assigned_to: uid(assignee_key),
    created_by_id: uid(creator_key),
    created_by_name: members.find((m) => m.id === uid(creator_key))?.name || owner.name,
    created_at: shiftIso(l.created_at, shiftMs),
    updated_at: shiftIso(l.updated_at, shiftMs),
    closed_at: shiftIso(l.closed_at, shiftMs) || null,
    follow_up_date: shiftDateStr(l.follow_up_date, shiftDays) || '',
    deleted_at: null,
  }));
  await store.insertMany('leads', leads);

  await store.insertMany(
    'activities',
    demo.activities.map(({ user_key, ...a }) => ({
      ...a,
      id: newId('act'),
      company_id: company.id,
      user_id: uid(user_key),
      timestamp: shiftIso(a.timestamp, shiftMs),
    }))
  );

  const today = now.slice(0, 10);
  await store.insertMany(
    'tasks',
    demo.tasks.map(({ user_key, due_offset_days, ...t }) => ({
      ...t,
      id: newId('tsk'),
      company_id: company.id,
      assigned_to: uid(user_key),
      lead_id: t.lead_id || null,
      lead_name: t.lead_id ? leads.find((l) => l.id === t.lead_id)?.name || null : null,
      due_date: shiftDateStr(today, due_offset_days),
      created_by: owner.id,
      created_at: now,
      updated_at: now,
    }))
  );

  console.log(`Demo company created for ${config.demoOwnerEmail} (${leads.length} leads, shifted ${shiftDays} days).`);
};

const bootstrap = async () => {
  await connect();
  await migrateLegacy();
  await ensureDemoCompany();
};

module.exports = { bootstrap, DEMO_COMPANY_ID };
