/**
 * Storage used by each company (owner + their staff) and by each member.
 *
 * The numbers are an estimate: the size of every record (as JSON) that belongs to the company.
 * Every company has a storage limit (default DEFAULT_STORAGE_LIMIT_MB) that only the Super Admin can change.
 * When the limit is reached, new data (leads, tasks, remarks, follow-ups...) is refused; reading and deleting still work.
 */
const { dataStore } = require('../repositories/dataStore');
const { isSuperAdmin } = require('./access');

const GENERIC_COMPANY_IDS = ['comp_1', 'comp_traveltrade_1', 'comp_stellarsync_1', 'comp_default', ''];
const DEFAULT_STORAGE_LIMIT_MB = Number(process.env.DEFAULT_STORAGE_LIMIT_MB) || 50;
const CACHE_MS = 60 * 1000;
const cache = new Map(); // ownerId -> { at, bytes }

const sizeOf = (record) => {
  try { return Buffer.byteLength(JSON.stringify(record)); } catch { return 0; }
};

const isOwnerRecord = (u) => u && (u.persona === 'owner' || (u.role === 'admin' && u.persona !== 'staff'));

/** The owner account a user belongs to (the user itself when they are an owner). */
const ownerOf = (user) => {
  if (!user) return null;
  const fresh = dataStore.users.find((u) => u.id === user.id) || user;
  if (isOwnerRecord(fresh)) return fresh;
  const ref = String(fresh.created_by || '').toLowerCase();
  return dataStore.users.find((u) => isOwnerRecord(u) && (u.id === fresh.created_by || String(u.email || '').toLowerCase() === ref))
    || dataStore.users.find((u) => isOwnerRecord(u) && fresh.company_id && !GENERIC_COMPANY_IDS.includes(fresh.company_id) && u.company_id === fresh.company_id)
    || null;
};

const storageLimitMb = (owner) => {
  const n = Number(owner && owner.storage_limit_mb);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_STORAGE_LIMIT_MB;
};

/** Every record of one company, plus a per-member breakdown. */
const tenantFootprint = (owner) => {
  const ownerCompanyId = owner.company_id && !GENERIC_COMPANY_IDS.includes(owner.company_id) ? owner.company_id : null;
  const staffList = dataStore.users.filter((staff) => {
    if (staff.id === owner.id || isOwnerRecord(staff)) return false;
    if (staff.created_by) {
      return staff.created_by === owner.id || String(staff.created_by).toLowerCase() === String(owner.email || '').toLowerCase();
    }
    return Boolean(ownerCompanyId && staff.company_id === ownerCompanyId);
  });
  const tenantUserRefs = new Set([
    owner.id,
    String(owner.email || '').toLowerCase(),
    ...staffList.flatMap((staff) => [staff.id, String(staff.email || '').toLowerCase()]),
  ].filter(Boolean));
  const belongsToOwner = (record, fields) =>
    (ownerCompanyId && record.company_id === ownerCompanyId) ||
    fields.some((field) => tenantUserRefs.has(String(record[field] || '').toLowerCase()));
  const leads = dataStore.leads.filter((lead) => belongsToOwner(lead, ['created_by', 'created_by_id', 'owner_id', 'assigned_to']));
  const leadIds = new Set(leads.map((lead) => String(lead.id)));
  const belongsToOwnerOrLead = (record, fields) =>
    belongsToOwner(record, fields) || (record.lead_id && leadIds.has(String(record.lead_id)));

  const groups = {
    leads,
    tasks: dataStore.tasks.filter((r) => belongsToOwnerOrLead(r, ['assigned_to', 'user_id', 'created_by', 'created_by_id', 'owner_id'])),
    activities: dataStore.activities.filter((r) => belongsToOwnerOrLead(r, ['user_id', 'actor_id', 'created_by', 'created_by_id', 'owner_id'])),
    followUps: dataStore.followUps.filter((r) => belongsToOwnerOrLead(r, ['assigned_to', 'user_id', 'created_by', 'created_by_id', 'owner_id'])),
    myDays: dataStore.myDays.filter((r) => belongsToOwner(r, ['user_id'])),
    outreach: dataStore.outreach.filter((r) => belongsToOwner(r, ['employee_id', 'owner_id', 'created_by', 'created_by_id'])),
    emailSettings: (dataStore.emailSettings || []).filter((r) => belongsToOwner(r, ['owner_id', 'created_by'])),
    emailCampaigns: (dataStore.emailCampaigns || []).filter((r) => belongsToOwnerOrLead(r, ['owner_id', 'created_by', 'created_by_id'])),
    auditLogs: dataStore.auditLogs.filter((r) => belongsToOwner(r, ['actor_id', 'user_id', 'created_by', 'owner_id'])),
    notifications: dataStore.notifications.filter((r) => belongsToOwner(r, ['target_user_id', 'owner_id'])),
    tickets: (dataStore.tickets || []).filter((r) => belongsToOwner(r, ['owner_id', 'created_by_id'])),
  };

  // Who "owns" each record: the person who created it (or the person it is for)
  const memberIds = [owner.id, ...staffList.map((s) => s.id)];
  const perMember = Object.fromEntries(memberIds.map((id) => [id, { bytes: 0, leads: 0, tasks: 0, followUps: 0, remarks: 0, myDays: 0 }]));
  const credit = (record, fields, kind) => {
    const who = fields.map((f) => record[f]).find((v) => v && perMember[v]) || owner.id;
    perMember[who].bytes += sizeOf(record);
    if (kind) perMember[who][kind] += 1;
  };
  groups.leads.forEach((l) => {
    credit(l, ['created_by_id', 'assigned_to'], 'leads');
    (Array.isArray(l.previous_remarks) ? l.previous_remarks : []).forEach((r) => {
      if (r && r.author_id && perMember[r.author_id]) perMember[r.author_id].remarks += 1;
    });
  });
  groups.tasks.forEach((t) => credit(t, ['created_by_id', 'assigned_to'], 'tasks'));
  groups.followUps.forEach((f) => credit(f, ['created_by_id', 'assigned_to', 'user_id'], 'followUps'));
  groups.myDays.forEach((m) => credit(m, ['user_id'], 'myDays'));
  groups.activities.forEach((a) => credit(a, ['user_id', 'actor_id', 'created_by_id']));
  groups.outreach.forEach((o) => credit(o, ['employee_id']));
  [...groups.emailSettings, ...groups.emailCampaigns, ...groups.auditLogs, ...groups.notifications].forEach((r) => credit(r, ['owner_id']));
  groups.tickets.forEach((t) => credit(t, ['created_by_id']));
  [owner, ...staffList].forEach((u) => credit(u, ['id']));

  const bytes = Object.values(perMember).reduce((t, m) => t + m.bytes, 0);
  const members = [owner, ...staffList].map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.id === owner.id ? 'Owner' : (u.role || 'Staff'),
    isActive: u.is_active !== false,
    ...perMember[u.id],
    kb: (perMember[u.id].bytes / 1024).toFixed(1),
  })).sort((a, b) => b.bytes - a.bytes);

  cache.set(owner.id, { at: Date.now(), bytes });
  return { ownerCompanyId, staffList, groups, bytes, members };
};

/** Cached company usage in bytes (recomputed at most once a minute). */
const usedBytes = (owner) => {
  const hit = cache.get(owner.id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.bytes;
  return tenantFootprint(owner).bytes;
};

/** Count new data immediately, so a burst of writes cannot slip past the limit between recounts. */
const addBytes = (owner, n) => {
  const hit = cache.get(owner.id);
  if (hit) hit.bytes += n;
};

const usageSummary = (owner) => {
  const bytes = usedBytes(owner);
  const limitMb = storageLimitMb(owner);
  return {
    used_bytes: bytes,
    used_mb: Number((bytes / 1024 / 1024).toFixed(2)),
    limit_mb: limitMb,
    percent: Math.min(100, Number(((bytes / (limitMb * 1024 * 1024)) * 100).toFixed(1))),
  };
};

/**
 * Express middleware for routes that save new data.
 * Super Admin is never limited. Deletes and reads are always allowed.
 */
const enforceStorageQuota = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  const user = req.user;
  if (!user || isSuperAdmin(user)) return next();
  const owner = ownerOf(user);
  if (!owner) return next();
  const incoming = Number(req.headers['content-length']) || 0;
  const limitBytes = storageLimitMb(owner) * 1024 * 1024;
  const used = usedBytes(owner);
  if (used + incoming > limitBytes) {
    return res.status(413).json({
      success: false,
      code: 'STORAGE_LIMIT_REACHED',
      message: `Your company has used its storage limit (${storageLimitMb(owner)} MB). New entries cannot be saved. Please ask the platform admin to increase the limit, or delete old records.`,
    });
  }
  addBytes(owner, incoming * 2); // saved records are larger than the request (ids, history)
  return next();
};

module.exports = {
  GENERIC_COMPANY_IDS,
  DEFAULT_STORAGE_LIMIT_MB,
  tenantFootprint,
  usedBytes,
  usageSummary,
  storageLimitMb,
  ownerOf,
  enforceStorageQuota,
  clearUsageCache: () => cache.clear(),
};
