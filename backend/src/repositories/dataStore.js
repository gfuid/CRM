/**
 * Production-ready in-memory Data Store & Repository Adapter
 * Database-agnostic layer with full CRUD operations for CRM entities.
 * Can be replaced or mapped to PostgreSQL, MongoDB, or Supabase seamlessly.
 * Reloaded: 2026-10-15
 */

const crypto = require('crypto');

const generateId = (prefix = 'item') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
// IDs of the old built-in demo records. They are never real customer data and are filtered out everywhere.
const DEMO_RECORD_IDS = new Set([
  'lead_1', 'lead_2', 'lead_3', 'lead_4', 'lead_5',
  'tsk_1', 'tsk_2', 'tsk_3',
  'act_1', 'act_2',
  'out_1',
  'day_1', 'day_2', 'day_3',
  'flw_1', 'flw_2', 'flw_3',
  'log_1', 'log_2', 'log_3',
]);
const withoutDemo = (list) => (Array.isArray(list) ? list.filter((r) => !(r && DEMO_RECORD_IDS.has(String(r.id)))) : list);

const GENERIC_COMPANY_IDS = new Set(['', 'comp_1', 'comp_traveltrade_1', 'comp_stellarsync_1', 'comp_default']);

const valuesForTenantQuery = (fields, values) => {
  const refs = values.filter(Boolean);
  return refs.length ? fields.map((field) => ({ [field]: { $in: refs } })) : [];
};

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter Tier',
    priceMonthly: 29,
    maxStaff: 2,
    maxLeads: 500,
    features: ['Up to 2 Staff Seats', '500 Leads Storage', 'Standard Analytics', 'Task Management', 'Email Notifications'],
    badge: 'Popular for Solo & Small Teams',
  },
  growth: {
    id: 'growth',
    name: 'Growth Tier',
    priceMonthly: 79,
    maxStaff: 15,
    maxLeads: 5000,
    features: ['Up to 15 Staff Seats', '5,000 Leads Storage', 'Dot-Matrix Analytics', 'Outreach Matrix', 'Priority Support', 'Custom Pipelines'],
    badge: 'Best Value for Scaling Companies',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Tier',
    priceMonthly: 199,
    maxStaff: 999999, // unlimited
    maxLeads: 999999,
    features: ['Unlimited Staff Seats', 'Unlimited Leads', 'Dedicated Account Manager', 'Custom AI Support', 'Full Security Audit Logs', 'SLA 99.9% Uptime'],
    badge: 'For Global Sales Organizations',
  },
};

// Seed initial production-like CRM data
const dataStore = {
  plans: SUBSCRIPTION_PLANS,

  company: {
    id: 'comp_stellarsync_1',
    name: 'Travel-Trade',
    industry: 'Travel, Tourism & Trade Services',
    currency: 'USD',
    timezone: 'UTC+05:30',
    revenueTargetMonthly: 0,
    plan: 'growth',
    maxStaff: 15,
    subscriptionStatus: 'active',
    created_at: new Date('2026-01-01').toISOString(),
  },

  tenants: [],
  users: [],
  notifications: [],
  emailSettings: [],
  emailCampaigns: [],
  tickets: [],
  appSettings: [],
  outreach: [],

  // No demo data: every company starts empty and only sees what its own people create.
  leads: [],
  tasks: [],
  activities: [],
  myDays: [],
  followUps: [],
  auditLogs: [],
};

// Lazy reference to DB status & models
const getDb = () => {
  try {
    const { isDbConnected } = require('../config/db');
    const models = require('../models');
    return { isConnected: isDbConnected(), models };
  } catch (e) {
    return { isConnected: false, models: null };
  }
};

// Tests must never read or overwrite the real local snapshot file
const SNAPSHOT_DISABLED = process.env.NODE_ENV === 'test' || process.env.DISABLE_SNAPSHOT === '1';

const writeSnapshotNow = () => {
  if (SNAPSHOT_DISABLED) return;
  try {
    const fs = require('fs');
    const path = require('path');
    const snapshotPath = path.join(__dirname, '../../backups/active_db_snapshot.json');
    const payload = {
      users: dataStore.users,
      deletedUserIds: dataStore.deletedUserIds || [],
      deletedUserEmails: dataStore.deletedUserEmails || [],
      leads: dataStore.leads,
      tasks: dataStore.tasks,
      activities: dataStore.activities,
      followUps: dataStore.followUps,
      myDays: dataStore.myDays,
      outreach: dataStore.outreach,
      auditLogs: dataStore.auditLogs,
      tickets: dataStore.tickets,
      appSettings: dataStore.appSettings,
      company: dataStore.company,
    };
    // Compact JSON (no pretty spaces) is smaller and much faster to write
    fs.writeFileSync(snapshotPath, JSON.stringify(payload), 'utf-8');
  } catch (err) {
    console.warn('[Snapshot Persistence Warning]:', err.message);
  }
};

// Many saves in a row (e.g. a bulk import) write the snapshot only once, shortly after the last one,
// instead of re-writing the whole file on every single save (which blocked the server).
let snapshotTimer = null;
const saveSnapshot = () => {
  if (SNAPSHOT_DISABLED) return;
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null;
    writeSnapshotNow();
  }, 1500);
  if (snapshotTimer.unref) snapshotTimer.unref();
};
saveSnapshot.flush = () => {
  if (snapshotTimer) { clearTimeout(snapshotTimer); snapshotTimer = null; }
  writeSnapshotNow();
};
process.once('beforeExit', () => { if (snapshotTimer) saveSnapshot.flush(); });

// Persistence helpers that sync updates directly to MongoDB Atlas
const dbSync = {
  saveUser: async (user) => {
    saveSnapshot();
    const { isConnected, models } = getDb();
    if (isConnected && models && models.User) {
      try {
        const query = user.id ? { $or: [{ id: user.id }, { email: user.email }] } : { email: user.email };
        const toSave = { ...user };
        delete toSave._id;
        await models.User.findOneAndUpdate(query, toSave, { upsert: true, returnDocument: 'after' });
      } catch (e) {
        console.warn('[DB User Sync]:', e.message);
      }
    }
  },
  deleteUser: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.User) {
      try {
        const mongoose = require('mongoose');
        const conditions = [{ id }, { email: String(id).toLowerCase() }];
        if (mongoose.Types.ObjectId.isValid(id)) {
          conditions.push({ _id: id });
        }
        await models.User.deleteMany({ $or: conditions });
      } catch (e) {
        console.warn('[DB User Delete]:', e.message);
        throw e;
      }
    }
    return true;
  },
  deleteTenantData: async ({ ownerId, ownerEmail, companyId }) => {
    const { isConnected, models } = getDb();
    const ownerRefs = [...new Set([ownerId, ownerEmail].filter(Boolean))];
    const companyIds = companyId && !GENERIC_COMPANY_IDS.has(companyId) ? [companyId] : [];
    const inMemoryUsers = dataStore.users.filter((user) =>
      user.id === ownerId ||
      (ownerEmail && user.email?.toLowerCase() === ownerEmail.toLowerCase()) ||
      ownerRefs.includes(user.created_by) ||
      (companyIds.length > 0 && companyIds.includes(user.company_id))
    );
    const userIds = new Set(inMemoryUsers.flatMap((user) => [user.id, user._id].filter(Boolean).map(String)));
    const userEmails = new Set(inMemoryUsers.map((user) => user.email).filter(Boolean).map((email) => email.toLowerCase()));
    const userRefs = new Set([...userIds, ...userEmails, ...ownerRefs]);
    const leadIds = new Set();
    const counts = {};

    const matchesLead = (lead) =>
      (lead.company_id && companyIds.includes(lead.company_id)) ||
      ['created_by', 'created_by_id', 'owner_id', 'assigned_to'].some((field) => userRefs.has(String(lead[field] || '')));
    const recordFilter = (fields, additional = []) => {
      const conditions = [
        ...valuesForTenantQuery(fields, [...userRefs]),
        ...valuesForTenantQuery(['company_id'], companyIds),
        ...(leadIds.size ? valuesForTenantQuery(['lead_id'], [...leadIds]) : []),
        ...additional,
      ];
      return conditions.length ? { $or: conditions } : { _id: { $exists: false } };
    };
    for (const lead of dataStore.leads) {
      if (matchesLead(lead) && lead.id) leadIds.add(String(lead.id));
    }

    if (isConnected && models) {
      const mongoose = require('mongoose');
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const ownerDocs = await models.User.find({
            $or: [{ id: ownerId }, { email: ownerEmail?.toLowerCase() }],
          }).session(session).lean();
          const ownerIdentity = new Set([
            ...ownerRefs,
            ...ownerDocs.flatMap((user) => [user.id, user.email].filter(Boolean)),
          ]);
          for (const owner of ownerDocs) {
            if (
              owner.company_id &&
              !GENERIC_COMPANY_IDS.has(owner.company_id) &&
              !companyIds.includes(owner.company_id)
            ) {
              companyIds.push(owner.company_id);
            }
          }
          const teamConditions = [
            ...valuesForTenantQuery(['created_by'], [...ownerIdentity]),
            ...valuesForTenantQuery(['company_id'], companyIds),
          ];
          const teamDocs = teamConditions.length
            ? await models.User.find({ $or: teamConditions }).session(session).lean()
            : [];
          for (const user of [...ownerDocs, ...teamDocs]) {
            if (user.id) userIds.add(String(user.id));
            if (user._id) userIds.add(String(user._id));
            if (user.email) userEmails.add(user.email.toLowerCase());
          }
          for (const email of userEmails) userRefs.add(email);
          for (const id of userIds) userRefs.add(id);

          const tenantLeadConditions = [
            ...valuesForTenantQuery(['created_by', 'created_by_id', 'owner_id', 'assigned_to'], [...userRefs]),
            ...valuesForTenantQuery(['company_id'], companyIds),
          ];
          const tenantLeadFilter = { $or: tenantLeadConditions };
          const leadDocs = await models.Lead.collection
            .find(tenantLeadFilter, { session, projection: { id: 1 } })
            .toArray();
          for (const lead of leadDocs) {
            if (lead.id) leadIds.add(String(lead.id));
          }

          const filters = {
            User: {
              $or: [
                ...valuesForTenantQuery(['id'], [...userIds]),
                ...valuesForTenantQuery(['email'], [...userEmails]),
                ...valuesForTenantQuery(['created_by'], ownerRefs),
                ...valuesForTenantQuery(['company_id'], companyIds),
              ],
            },
            Lead: tenantLeadFilter,
            Task: recordFilter(['assigned_to', 'created_by', 'created_by_id', 'owner_id']),
            Activity: recordFilter(['user_id', 'actor_id', 'created_by', 'created_by_id', 'owner_id']),
            FollowUp: recordFilter(['assigned_to', 'user_id', 'created_by', 'created_by_id', 'owner_id']),
            MyDay: recordFilter(['user_id']),
            Outreach: recordFilter(['owner_id', 'created_by', 'created_by_id']),
            AuditLog: recordFilter(['actor_id', 'user_id', 'created_by', 'owner_id']),
            Notification: recordFilter(['target_user_id', 'owner_id']),
            EmailSetting: recordFilter(['owner_id', 'created_by']),
            EmailCampaign: recordFilter(['owner_id', 'created_by', 'created_by_id']),
            Ticket: recordFilter(['owner_id', 'created_by_id']),
          };

          if (companyIds.length) {
            filters.Company = { id: { $in: companyIds } };
          }
          for (const [modelName, filter] of Object.entries(filters)) {
            const result = await models[modelName].collection.deleteMany(filter, { session });
            counts[modelName] = result.deletedCount || 0;
          }
        });
      } finally {
        await session.endSession();
      }
    }

    return {
      userIds: [...userIds],
      userEmails: [...userEmails],
      leadIds: [...leadIds],
      companyIds,
      counts,
    };
  },
  saveLead: async (lead) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Lead) {
      try {
        await models.Lead.findOneAndUpdate({ id: lead.id }, lead, { upsert: true, new: true });
      } catch (e) {
        console.warn('[DB Lead Sync]:', e.message);
      }
    }
  },
  deleteLead: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Lead) {
      try {
        await models.Lead.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
  saveTask: async (task) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Task) {
      try {
        await models.Task.findOneAndUpdate({ id: task.id }, task, { upsert: true, new: true });
      } catch (e) {
        console.warn('[DB Task Sync]:', e.message);
      }
    }
  },
  deleteTask: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Task) {
      try {
        await models.Task.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
  saveActivity: async (activity) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Activity) {
      try {
        await models.Activity.findOneAndUpdate({ id: activity.id }, activity, { upsert: true, new: true });
      } catch (e) {}
    }
  },
  saveFollowUp: async (item) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.FollowUp) {
      try {
        await models.FollowUp.findOneAndUpdate({ id: item.id }, item, { upsert: true, new: true });
      } catch (e) {}
    }
  },
  deleteFollowUp: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.FollowUp) {
      try {
        await models.FollowUp.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
  saveMyDay: async (item) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.MyDay) {
      try {
        await models.MyDay.findOneAndUpdate({ id: item.id }, item, { upsert: true, new: true });
      } catch (e) {}
    }
  },
  deleteMyDay: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.MyDay) {
      try {
        await models.MyDay.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
  saveOutreach: async (item) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Outreach) {
      try {
        await models.Outreach.findOneAndUpdate({ id: item.id }, item, { upsert: true, new: true });
      } catch (e) {}
    }
  },
  saveCompany: async (comp) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Company) {
      try {
        await models.Company.findOneAndUpdate({}, comp, { upsert: true, new: true });
      } catch (e) {}
    }
  },
  saveAuditLog: async (log) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.AuditLog) {
      try {
        await models.AuditLog.create(log);
      } catch (e) {}
    }
  },
  saveNotification: async (notif) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Notification) {
      try {
        await models.Notification.findOneAndUpdate({ id: notif.id }, notif, { upsert: true, new: true });
      } catch (e) {
        console.warn('[DB Notification Sync]:', e.message);
      }
    }
  },
  deleteNotification: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Notification) {
      try {
        await models.Notification.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
  saveEmailSetting: async (setting) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.EmailSetting) {
      try {
        const toSave = { ...setting };
        delete toSave._id;
        await models.EmailSetting.findOneAndUpdate({ owner_id: setting.owner_id }, toSave, { upsert: true, new: true });
      } catch (e) {
        console.warn('[DB EmailSetting Sync]:', e.message);
      }
    }
  },
  saveTicket: async (ticket) => {
    saveSnapshot();
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Ticket) {
      try {
        const toSave = { ...ticket };
        delete toSave._id;
        await models.Ticket.findOneAndUpdate({ id: ticket.id }, toSave, { upsert: true, new: true });
      } catch (e) {
        console.warn('[DB Ticket Sync]:', e.message);
      }
    }
  },
  saveAppSetting: async (setting) => {
    saveSnapshot();
    const { isConnected, models } = getDb();
    if (isConnected && models && models.AppSetting) {
      try {
        const toSave = { ...setting };
        delete toSave._id;
        await models.AppSetting.findOneAndUpdate({ id: setting.id }, toSave, { upsert: true, new: true });
      } catch (e) {
        console.warn('[DB AppSetting Sync]:', e.message);
      }
    }
  },
  saveEmailCampaign: async (campaign) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.EmailCampaign) {
      try {
        const toSave = { ...campaign };
        delete toSave._id;
        await models.EmailCampaign.findOneAndUpdate({ id: campaign.id }, toSave, { upsert: true, new: true });
      } catch (e) {
        console.warn('[DB EmailCampaign Sync]:', e.message);
      }
    }
  },
  deleteEmailCampaign: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.EmailCampaign) {
      try {
        await models.EmailCampaign.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
};

// Instant recovery & offline persistence: hydrate immediately from local snapshot
try {
  const fs = require('fs');
  const path = require('path');
  const snapshotPath = path.join(__dirname, '../../backups/active_db_snapshot.json');
  if (!SNAPSHOT_DISABLED && fs.existsSync(snapshotPath)) {
    const raw = fs.readFileSync(snapshotPath, 'utf-8');
    const snap = JSON.parse(raw);
    if (snap.users && snap.users.length > 0) dataStore.users = snap.users;
    if (snap.deletedUserIds && Array.isArray(snap.deletedUserIds)) dataStore.deletedUserIds = snap.deletedUserIds;
    if (snap.deletedUserEmails && Array.isArray(snap.deletedUserEmails)) dataStore.deletedUserEmails = snap.deletedUserEmails;
    if (snap.leads && snap.leads.length > 0) dataStore.leads = withoutDemo(snap.leads);
    if (snap.tasks && snap.tasks.length > 0) dataStore.tasks = withoutDemo(snap.tasks);
    if (snap.activities && snap.activities.length > 0) dataStore.activities = withoutDemo(snap.activities);
    if (snap.followUps && snap.followUps.length > 0) dataStore.followUps = withoutDemo(snap.followUps);
    if (snap.myDays && snap.myDays.length > 0) dataStore.myDays = withoutDemo(snap.myDays);
    if (snap.outreach && snap.outreach.length > 0) dataStore.outreach = withoutDemo(snap.outreach);
    if (snap.auditLogs && snap.auditLogs.length > 0) dataStore.auditLogs = withoutDemo(snap.auditLogs);
    if (snap.company) dataStore.company = snap.company;

    const isUserDeleted = (email, id) => {
      const deletedIds = dataStore.deletedUserIds || [];
      const deletedEmails = dataStore.deletedUserEmails || [];
      // Match by id; an email alone only counts for old records without an id (a deleted email may be reused)
      return (
        (id && deletedIds.includes(String(id))) ||
        (!id && email && deletedEmails.includes(String(email).toLowerCase()))
      );
    };

    // Strip out any previously deleted users
    if (dataStore.users && dataStore.users.length > 0) {
      dataStore.users = dataStore.users.filter((u) => !isUserDeleted(u.email, u.id));
    }

    const keerthana = dataStore.users.find(
      (u) =>
        u.id === 'usr_1791814468302_hoa08z' ||
        u.email === 'bioniversiobiologics@arggroups.com'
    );
    if (keerthana) {
      if (keerthana.staff_limit === undefined || keerthana.staff_limit === null) keerthana.staff_limit = 10;
      keerthana.company_id = 'comp_bioniversio_1';
      keerthana.company_name = 'Bioniversio Biologics';
    }

    // Guarantee strict tenant isolation for all owners & staff
    if (dataStore.users && dataStore.users.length > 0) {
      const { enforceTenantIsolation } = require('../utils/tenantScope');
      enforceTenantIsolation(dataStore.users);
    }

    saveSnapshot();
  }
} catch (e) {}

module.exports = {
  DEMO_RECORD_IDS,
  withoutDemo,
  dataStore,
  generateId,
  dbSync,
  saveSnapshot,
};
