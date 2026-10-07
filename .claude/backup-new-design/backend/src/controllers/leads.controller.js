const ApiResponse = require('../utils/apiResponse');
const { newId, nowIso } = require('../db/tenant');
const { HttpError, text, dateOnly, oneOf } = require('../utils/validate');
const { leadVisibilityFilter, canSeeLead } = require('../services/permissions');
const { OUTREACH_TYPES } = require('../services/activityTypes');
const { sanitizeLeadInput, findDuplicate, buildActivity, decorateLead, usersMap } = require('../services/leads');
const { audit } = require('../services/audit');

const MAX_IMPORT_ROWS = 2000;

const loadVisibleLead = async (req, id) => {
  const lead = await req.db.findOne('leads', { id });
  if (!lead || !canSeeLead(req.user, lead)) throw new HttpError(404, 'Lead not found');
  return lead;
};

/** Validates that a lead can be assigned to this user id (active member of the same company). */
const resolveAssignee = async (req, userId) => {
  const user = await req.db.findOne('users', { id: userId });
  if (!user || !user.is_active) throw new HttpError(400, 'Choose an active team member to assign this lead to');
  return user;
};

const matchesSearch = (lead, q) =>
  [lead.name, lead.contact_person, lead.email, lead.phone, lead.country, lead.source, lead.product]
    .concat((lead.contacts || []).flatMap((c) => [c.name, c.email, c.phone]))
    .some((v) => v && String(v).toLowerCase().includes(q));

/** GET /leads */
const getLeads = async (req, res) => {
  const { stage, priority, search, assigned_to, product, country, from, to } = req.query;
  const filter = leadVisibilityFilter(req.user);
  if (stage) filter.stage = stage;
  if (priority) filter.priority = priority;
  if (assigned_to && req.perms.leads_scope === 'all') filter.assigned_to = assigned_to;

  let leads = await req.db.find('leads', filter, { sort: { created_at: -1 } });

  if (country) {
    const c = String(country).toLowerCase();
    leads = leads.filter((l) => (l.country || '').toLowerCase().includes(c));
  }
  if (product) {
    const p = String(product).toLowerCase();
    leads = leads.filter((l) => (l.products || []).some((x) => x.toLowerCase() === p));
  }
  if (from) leads = leads.filter((l) => (l.created_at || '') >= String(from));
  if (to) leads = leads.filter((l) => (l.created_at || '').slice(0, 10) <= String(to));
  if (search) {
    const q = String(search).toLowerCase().trim();
    if (q) leads = leads.filter((l) => matchesSearch(l, q));
  }

  const users = await usersMap(req.db);
  const data = leads.map((l) => decorateLead(l, users));
  return ApiResponse.success(res, data, 'Leads retrieved', 200, { total: data.length });
};

/** GET /leads/:id — the lead with its full timeline, tasks and follow-ups. */
const getLeadById = async (req, res) => {
  const lead = await loadVisibleLead(req, req.params.id);
  const [activities, tasks, users] = await Promise.all([
    req.db.find('activities', { lead_id: lead.id }, { sort: { timestamp: -1 } }),
    req.db.find('tasks', { lead_id: lead.id }, { sort: { due_date: 1 } }),
    usersMap(req.db),
  ]);
  const withUser = (a) => ({ ...a, user_name: users.get(a.user_id)?.name || 'Former member' });
  return ApiResponse.success(res, {
    ...decorateLead(lead, users),
    activities: activities.map(withUser),
    tasks: tasks.map((t) => ({ ...t, assigned_name: users.get(t.assigned_to)?.name || 'Unassigned' })),
  });
};

/** POST /leads */
const createLead = async (req, res) => {
  const input = sanitizeLeadInput(req.body, { requireName: true });

  if (!req.body.allow_duplicate) {
    const existing = await req.db.find('leads', { deleted_at: null });
    const dup = findDuplicate(input, existing);
    if (dup) {
      const users = await usersMap(req.db);
      throw new HttpError(409, `A lead for "${dup.name}" already exists`, {
        duplicate: { id: dup.id, name: dup.name, assigned_name: users.get(dup.assigned_to)?.name || 'Unassigned' },
      });
    }
  }

  let assignee = req.user;
  if (req.body.assigned_to && req.body.assigned_to !== req.user.id) {
    if (!req.perms.leads_reassign) throw new HttpError(403, 'You can only create leads for yourself');
    assignee = await resolveAssignee(req, req.body.assigned_to);
  }

  const now = nowIso();
  const lead = {
    stage: 'Lead Generation',
    priority: 'Medium',
    currency: req.company.settings?.currency || 'INR',
    products: [],
    contacts: [],
    ...input,
    id: newId('lead'),
    assigned_to: assignee.id,
    created_by_id: req.user.id,
    created_by_name: req.user.name,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await req.db.insert('leads', lead);
  await req.db.insert('activities', buildActivity(req, { lead, type: 'new_lead', note: `Lead created${assignee.id !== req.user.id ? ` and assigned to ${assignee.name}` : ''}` }));

  const users = await usersMap(req.db);
  return ApiResponse.created(res, decorateLead(lead, users), 'Lead created');
};

/** PATCH /leads/:id */
const updateLead = async (req, res) => {
  if (!req.perms.leads_edit) throw new HttpError(403, 'You do not have permission to edit leads');
  const current = await loadVisibleLead(req, req.params.id);
  const set = sanitizeLeadInput(req.body);
  const activities = [];

  if (req.body.assigned_to !== undefined && req.body.assigned_to !== current.assigned_to) {
    if (!req.perms.leads_reassign) throw new HttpError(403, 'You do not have permission to reassign leads');
    const target = await resolveAssignee(req, req.body.assigned_to);
    const users = await usersMap(req.db);
    set.assigned_to = target.id;
    const fromName = users.get(current.assigned_to)?.name || 'Unassigned';
    activities.push(buildActivity(req, {
      lead: current,
      type: 'reassign',
      note: `Reassigned from ${fromName} to ${target.name}`,
      meta: { from: current.assigned_to, to: target.id },
    }));
    await audit(req, 'LEAD_REASSIGNED', `${current.name}: ${fromName} → ${target.name}`, { lead_id: current.id });
  }

  if (set.stage && set.stage !== current.stage) {
    activities.push(buildActivity(req, {
      lead: current,
      type: 'stage_change',
      note: `${current.stage || 'No stage'} → ${set.stage}`,
      meta: { from: current.stage, to: set.stage },
    }));
    if (set.stage === 'Closed Won' || current.stage === 'Closed Won') {
      await audit(req, 'LEAD_STAGE_CHANGED', `${current.name}: ${current.stage} → ${set.stage}`, { lead_id: current.id });
    }
  }

  if (set.stage && set.stage !== current.stage) {
    set.closed_at = set.stage === 'Closed Won' || set.stage === 'Closed Lost' ? nowIso() : null;
  }

  if (set.value !== undefined && set.value !== current.value) {
    await audit(req, 'LEAD_VALUE_CHANGED', `${current.name}: ${current.value || 0} → ${set.value}`, { lead_id: current.id });
  }

  if (set.follow_up_date && set.follow_up_date !== current.follow_up_date) {
    activities.push(buildActivity(req, { lead: current, type: 'follow_up', note: `Next follow-up on ${set.follow_up_date}` }));
  }

  set.updated_at = nowIso();
  const updated = await req.db.update('leads', { id: current.id }, set);
  for (const a of activities) await req.db.insert('activities', a);

  const users = await usersMap(req.db);
  return ApiResponse.success(res, decorateLead(updated, users), 'Lead updated');
};

/** DELETE /leads/:id — moves the lead to the trash (owner can restore it). */
const deleteLead = async (req, res) => {
  if (!req.perms.leads_delete) throw new HttpError(403, 'You do not have permission to delete leads');
  const lead = await loadVisibleLead(req, req.params.id);
  await req.db.update('leads', { id: lead.id }, { deleted_at: nowIso(), deleted_by: req.user.id });
  await req.db.insert('activities', buildActivity(req, { lead, type: 'lead_deleted' }));
  await audit(req, 'LEAD_DELETED', `Moved "${lead.name}" to trash`, { lead_id: lead.id });
  return ApiResponse.success(res, { id: lead.id }, 'Lead moved to trash');
};

/** GET /leads/trash — owner only */
const getTrash = async (req, res) => {
  const leads = await req.db.find('leads', { deleted_at: { $ne: null } }, { sort: { deleted_at: -1 } });
  const users = await usersMap(req.db);
  return ApiResponse.success(
    res,
    leads.map((l) => ({ ...decorateLead(l, users), deleted_by_name: users.get(l.deleted_by)?.name || 'Unknown' }))
  );
};

/** POST /leads/:id/restore — owner only */
const restoreLead = async (req, res) => {
  const lead = await req.db.findOne('leads', { id: req.params.id, deleted_at: { $ne: null } });
  if (!lead) throw new HttpError(404, 'Lead not found in trash');
  const restored = await req.db.update('leads', { id: lead.id }, { deleted_at: null, deleted_by: null, updated_at: nowIso() });
  await req.db.insert('activities', buildActivity(req, { lead, type: 'lead_restored' }));
  await audit(req, 'LEAD_RESTORED', `Restored "${lead.name}" from trash`, { lead_id: lead.id });
  const users = await usersMap(req.db);
  return ApiResponse.success(res, decorateLead(restored, users), 'Lead restored');
};

/** DELETE /leads/:id/purge — owner only, permanent. */
const purgeLead = async (req, res) => {
  const lead = await req.db.findOne('leads', { id: req.params.id, deleted_at: { $ne: null } });
  if (!lead) throw new HttpError(404, 'Lead not found in trash');
  await req.db.remove('leads', { id: lead.id });
  await audit(req, 'LEAD_PURGED', `Permanently deleted "${lead.name}"`, { lead_id: lead.id });
  return ApiResponse.success(res, { id: lead.id }, 'Lead permanently deleted');
};

/** POST /leads/:id/activities — log a call/email/WhatsApp/etc, optionally with the next follow-up. */
const logLeadActivity = async (req, res) => {
  const lead = await loadVisibleLead(req, req.params.id);
  const type = oneOf(req.body.type, [...OUTREACH_TYPES, 'note'], { field: 'Activity type' }) || 'note';
  const note = text(req.body.note, { field: 'Note', max: 3000 }) || '';
  const nextFollowUp = dateOnly(req.body.next_follow_up_date, { field: 'Next follow-up date' });
  const stage = req.body.stage;

  const activity = buildActivity(req, { lead, type, note });
  await req.db.insert('activities', activity);

  const set = { last_activity_at: activity.timestamp, updated_at: nowIso() };
  if (nextFollowUp !== undefined) set.follow_up_date = nextFollowUp;
  if (stage && stage !== lead.stage) {
    const sanitized = sanitizeLeadInput({ stage });
    set.stage = sanitized.stage;
    set.closed_at = sanitized.stage === 'Closed Won' || sanitized.stage === 'Closed Lost' ? nowIso() : null;
    await req.db.insert('activities', buildActivity(req, {
      lead,
      type: 'stage_change',
      note: `${lead.stage || 'No stage'} → ${sanitized.stage}`,
      meta: { from: lead.stage, to: sanitized.stage },
    }));
  }
  const updated = await req.db.update('leads', { id: lead.id }, set);
  const users = await usersMap(req.db);
  return ApiResponse.created(res, {
    activity: { ...activity, user_name: req.user.name },
    lead: decorateLead(updated, users),
  }, 'Activity logged');
};

const csvCell = (v) => {
  let s = v === undefined || v === null ? '' : Array.isArray(v) ? v.join('; ') : String(v);
  // Prevent spreadsheet formula injection
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** GET /leads/export — CSV of the leads this user can see. Requires leads_export. */
const exportLeads = async (req, res) => {
  const leads = await req.db.find('leads', leadVisibilityFilter(req.user), { sort: { created_at: -1 } });
  const users = await usersMap(req.db);
  const columns = [
    ['Company', 'name'], ['Contact person', 'contact_person'], ['Email', 'email'], ['Phone', 'phone'],
    ['WhatsApp', 'whatsapp'], ['Country', 'country'], ['Source', 'source'], ['Products', 'products'],
    ['Quantity', 'quantity'], ['Price', 'price'], ['Deal value', 'value'], ['Currency', 'currency'],
    ['Stage', 'stage'], ['Priority', 'priority'], ['Follow-up date', 'follow_up_date'],
    ['Assigned to', 'agent_name'], ['Created by', 'created_by_name'], ['Created at', 'created_at'], ['Notes', 'notes'],
  ];
  const rows = leads.map((l) => decorateLead(l, users));
  const csv = [columns.map(([h]) => h).join(',')]
    .concat(rows.map((r) => columns.map(([, k]) => csvCell(r[k])).join(',')))
    .join('\n');
  await audit(req, 'LEADS_EXPORTED', `Exported ${rows.length} leads to CSV`, { count: rows.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(`﻿${csv}`);
};

/** POST /leads/import — { leads: [...] }; skips duplicates and reports row errors. Requires leads_import. */
const importLeads = async (req, res) => {
  const rows = Array.isArray(req.body.leads) ? req.body.leads : null;
  if (!rows || rows.length === 0) throw new HttpError(400, 'No rows to import');
  if (rows.length > MAX_IMPORT_ROWS) throw new HttpError(400, `You can import at most ${MAX_IMPORT_ROWS} rows at a time`);

  const existing = await req.db.find('leads', { deleted_at: null });
  const created = [];
  const skipped = [];
  const errors = [];
  const now = nowIso();

  rows.forEach((row, i) => {
    try {
      const input = sanitizeLeadInput(row, { requireName: true });
      const dup = findDuplicate(input, existing.concat(created));
      if (dup) {
        skipped.push({ row: i + 1, name: input.name, reason: `Duplicate of "${dup.name}"` });
        return;
      }
      created.push({
        stage: 'Lead Generation',
        priority: 'Medium',
        currency: req.company.settings?.currency || 'INR',
        products: [],
        contacts: [],
        ...input,
        id: newId('lead'),
        assigned_to: req.user.id,
        created_by_id: req.user.id,
        created_by_name: req.user.name,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    } catch (err) {
      errors.push({ row: i + 1, reason: err.message });
    }
  });

  if (created.length) await req.db.insertMany('leads', created);
  await audit(req, 'LEADS_IMPORTED', `Imported ${created.length} leads (${skipped.length} duplicates skipped, ${errors.length} errors)`, {
    count: created.length,
  });
  return ApiResponse.success(res, { created: created.length, skipped, errors }, `Imported ${created.length} leads`);
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getTrash,
  restoreLead,
  purgeLead,
  logLeadActivity,
  exportLeads,
  importLeads,
};
