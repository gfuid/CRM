const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { getTenantContext, isLeadInUserScope } = require('../utils/tenantScope');

const { isOwnerUser: isCompanyOwner, isSuperAdmin, sameValue, todayISO, viewBlocked } = require('../utils/access');

const isOwnerUser = (user) => isCompanyOwner(user) || isSuperAdmin(user);
const VALID_STATUSES = ['Scheduled', 'Pending', 'Completed', 'Cancelled', 'Rescheduled', 'Missed'];
const OPEN_STATUSES = ['Scheduled', 'Pending', 'Rescheduled'];
const OWNER_FU_FIELDS = ['client_name', 'lead_name', 'company', 'scheduled_date', 'date', 'scheduled_time', 'time', 'type', 'channel', 'agenda', 'note', 'remark', 'today_remarks', 'next_follow_up_action', 'status', 'assigned_to', 'lead_id', 'reschedule_reason'];
// Staff may record the outcome, plan the next step, reschedule (with a reason) and change status. Not the client or agenda.
const STAFF_FU_FIELDS = ['scheduled_date', 'date', 'scheduled_time', 'time', 'remark', 'today_remarks', 'next_follow_up_action', 'status', 'reschedule_reason'];

/** Follow-up as shown to users: a past, still-open follow-up shows as "Missed". */
const withComputed = (f) => {
  const due = String(f.scheduled_date || f.date || '').split('T')[0];
  const overdue = Boolean(due && OPEN_STATUSES.includes(f.status) && due < todayISO());
  return {
    ...f,
    stored_status: f.status,
    status: overdue ? 'Missed' : f.status,
    is_overdue: overdue,
    reschedule_count: Array.isArray(f.history) ? f.history.filter((h) => h.action === 'rescheduled').length : 0,
  };
};

const isFollowUpInUserScope = (followUp, user) => {
  const ctx = getTenantContext(user);
  if (ctx.isSuperAdmin) return true;
  if (!isOwnerUser(user)) return followUp.assigned_to === user.id;
  if (followUp.company_id && (followUp.company_id === ctx.companyId || followUp.company_id === ctx.ownerId)) return true;
  if (followUp.owner_id === ctx.ownerId) return true;
  if (ctx.allowedUserIds.has(followUp.assigned_to) || ctx.allowedUserIds.has(followUp.created_by_id)) return true;
  const linkedLead = followUp.lead_id && dataStore.leads.find((lead) => lead.id === followUp.lead_id);
  return !!linkedLead && isLeadInUserScope(linkedLead, user);
};

/**
 * Get all follow-ups
 */
const getFollowUps = async (req, res) => {
  if (viewBlocked(req.user, 'view_followup')) {
    return ApiResponse.error(res, 'Access denied: Your company owner has not given you access to Follow-ups.', 403);
  }
  const { status, assigned_to } = req.query;
  let list = [...dataStore.followUps];

  const ctx = getTenantContext(req.user);
  if (!ctx.isSuperAdmin) {
    if (!isOwnerUser(req.user)) {
      list = list.filter((f) => f.assigned_to === req.user.id);
    } else {
      list = list.filter((followUp) => isFollowUpInUserScope(followUp, req.user));
    }
  }
  if (!isOwnerUser(req.user) && assigned_to && assigned_to !== req.user.id) {
    list = [];
  } else if (assigned_to) {
    list = list.filter((followUp) => followUp.assigned_to === assigned_to);
  }

  const populated = list.map((f) => {
    const user = dataStore.users.find((u) => u.id === f.assigned_to);
    return {
      ...withComputed(f),
      assigned_name: user ? user.name : 'Unassigned',
    };
  });

  const filtered = status ? populated.filter((f) => String(f.status || '').toLowerCase() === String(status).toLowerCase()) : populated;
  return ApiResponse.success(res, filtered, 'Follow-ups retrieved successfully');
};

/**
 * Create new follow-up
 */
const createFollowUp = async (req, res) => {
  if (!isOwnerUser(req.user) && req.user?.permissions?.can_create === false) {
    return ApiResponse.error(res, 'Access denied: You do not have permission to create follow-ups.', 403);
  }
  const {
    lead_id,
    client_name,
    company,
    scheduled_date,
    scheduled_time,
    type,
    agenda,
    assigned_to,
    lead_name,
    contact_person,
    date,
    time,
    channel,
    note,
    remark,
    today_remarks,
    next_follow_up_action,
  } = req.body;

  const finalClientName = client_name || lead_name || contact_person;
  const finalScheduledDate = scheduled_date || date;
  const finalScheduledTime = scheduled_time || time || '10:00 AM';
  const finalType = type || channel || 'Phone Call';
  const finalAgenda = next_follow_up_action || agenda || note || remark || 'General Follow-up';
  const finalTodayRemarks = today_remarks || remark || note || '';
  const finalPlannedAction = next_follow_up_action || agenda || '';

  if (!finalClientName || !finalScheduledDate) {
    return ApiResponse.error(res, 'Client name and scheduled date are required', 400);
  }

  const ctx = getTenantContext(req.user);
  const finalAssignedTo = isOwnerUser(req.user) ? (assigned_to || req.user.id) : req.user.id;
  if (!ctx.isSuperAdmin && !ctx.allowedUserIds.has(finalAssignedTo)) {
    return ApiResponse.error(res, 'Assigned staff member does not belong to your organization', 400);
  }
  if (lead_id) {
    const lead = dataStore.leads.find((item) => item.id === lead_id);
    if (!lead || !isLeadInUserScope(lead, req.user)) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }
  }

  const newFollowUp = {
    id: generateId('flw'),
    company_id: ctx.companyId,
    owner_id: ctx.ownerId,
    created_by_id: req.user.id,
    lead_id: lead_id || null,
    client_name: finalClientName,
    lead_name: finalClientName,
    company: company || '',
    scheduled_date: finalScheduledDate,
    date: finalScheduledDate,
    scheduled_time: finalScheduledTime,
    time: finalScheduledTime,
    type: finalType,
    channel: finalType,
    agenda: finalAgenda,
    note: finalAgenda,
    remark: remark || '',
    today_remarks: finalTodayRemarks,
    next_follow_up_action: finalPlannedAction,
    status: 'Scheduled',
    assigned_to: finalAssignedTo,
    history: [{ action: 'scheduled', to: finalScheduledDate, remark: finalTodayRemarks, at: new Date().toISOString(), by: req.user.id, by_name: req.user.name || '' }],
    created_at: new Date().toISOString(),
  };

  dataStore.followUps.unshift(newFollowUp);
  dbSync.saveFollowUp(newFollowUp);

  // If connected to a lead, sync follow_up_date, today_remarks, next_follow_up_action and previous_remarks
  if (lead_id) {
    const lead = dataStore.leads.find((l) => l.id === lead_id);
    if (lead) {
      lead.follow_up_date = finalScheduledDate;
      if (finalTodayRemarks) lead.today_remarks = finalTodayRemarks;
      if (finalPlannedAction) lead.next_follow_up_action = finalPlannedAction;

      const newRemarkHistory = {
        today_remark: finalTodayRemarks,
        planned_action: finalPlannedAction,
        remark: [
          finalTodayRemarks ? `Interaction: ${finalTodayRemarks}` : null,
          finalPlannedAction ? `Planned for ${finalScheduledDate}: ${finalPlannedAction}` : null,
        ].filter(Boolean).join(' | '),
        follow_up_date: finalScheduledDate,
        date: new Date().toISOString(),
        author: req.user ? (req.user.name || req.user.full_name) : 'User',
        author_id: req.user.id,
      };
      lead.previous_remarks = [newRemarkHistory, ...(lead.previous_remarks || [])];
      dbSync.saveLead(lead);
    }
  }

  return ApiResponse.created(res, withComputed(newFollowUp), 'Follow-up scheduled successfully');
};

/**
 * Update follow-up status
 */
const updateFollowUp = async (req, res) => {
  const { id } = req.params;
  const followUp = dataStore.followUps.find((f) => f.id === id);

  if (!followUp) {
    return ApiResponse.error(res, 'Follow-up not found', 404);
  }

  if (!isFollowUpInUserScope(followUp, req.user)) {
    return ApiResponse.error(res, 'Follow-up not found', 404);
  }

  const owner = isOwnerUser(req.user);
  if (!owner && req.user?.permissions?.can_update === false) {
    return ApiResponse.error(res, 'Access denied: You do not have permission to update follow-ups.', 403);
  }

  // Normalise aliases and keep only real changes (screens may send the whole record back)
  const body = { ...(req.body || {}) };
  if (body.scheduled_date === undefined && body.date !== undefined) body.scheduled_date = body.date;
  if (body.scheduled_time === undefined && body.time !== undefined) body.scheduled_time = body.time;
  if (body.today_remarks === undefined && body.remark !== undefined) body.today_remarks = body.remark;
  delete body.date;
  delete body.time;
  if (body.status === 'Missed' || body.status === followUp.status) delete body.status; // "Missed" is computed, never stored

  const allowedFields = owner ? OWNER_FU_FIELDS : STAFF_FU_FIELDS;
  const changes = {};
  const blocked = [];
  for (const [field, value] of Object.entries(body)) {
    if (!OWNER_FU_FIELDS.includes(field)) continue;
    if (sameValue(value, followUp[field])) continue;
    if (!allowedFields.includes(field)) {
      blocked.push(field);
      continue;
    }
    changes[field] = value;
  }
  if (blocked.length) {
    return ApiResponse.error(res, `Only your company owner can change: ${blocked.join(', ')}.`, 403);
  }
  if (changes.status !== undefined && !VALID_STATUSES.includes(changes.status)) {
    return ApiResponse.error(res, 'Follow-up status is invalid', 400);
  }
  const ctx = getTenantContext(req.user);
  if (owner && changes.assigned_to && !ctx.isSuperAdmin && !ctx.allowedUserIds.has(changes.assigned_to)) {
    return ApiResponse.error(res, 'Assigned staff member does not belong to your organization', 400);
  }
  if (changes.lead_id) {
    const lead = dataStore.leads.find((item) => item.id === changes.lead_id);
    if (!lead || !isLeadInUserScope(lead, req.user)) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }
  }

  const remarkText = String(changes.today_remarks || changes.reschedule_reason || '').trim();
  const isCompleting = changes.status === 'Completed' && followUp.status !== 'Completed';
  const isRescheduling = changes.scheduled_date !== undefined && changes.scheduled_date !== followUp.scheduled_date;

  if (isCompleting && !remarkText) {
    return ApiResponse.error(res, 'Write what was discussed before marking this follow-up as completed.', 400);
  }
  if (isRescheduling && !owner && !remarkText) {
    return ApiResponse.error(res, 'Give a reason when you reschedule a follow-up (e.g. "client asked to call next week").', 400);
  }
  if (!owner && followUp.status === 'Completed' && Object.keys(changes).length) {
    return ApiResponse.error(res, 'This follow-up is already completed. Schedule a new follow-up instead.', 403);
  }
  if (!owner && changes.status === 'Cancelled') {
    return ApiResponse.error(res, 'Only your company owner can cancel a follow-up.', 403);
  }
  if (Object.keys(changes).length === 0) {
    return ApiResponse.success(res, withComputed(followUp), 'No changes to save');
  }

  const now = new Date().toISOString();
  const entry = { at: now, by: req.user.id, by_name: req.user.name || '', remark: remarkText };
  const history = Array.isArray(followUp.history) ? [...followUp.history] : [];
  if (isRescheduling) {
    history.push({ ...entry, action: 'rescheduled', from: followUp.scheduled_date, to: changes.scheduled_date, was_overdue: Boolean(followUp.scheduled_date && followUp.scheduled_date < todayISO()) });
    if (changes.status === undefined && followUp.status !== 'Completed') changes.status = 'Rescheduled';
  }
  if (changes.status !== undefined && changes.status !== followUp.status) {
    history.push({ ...entry, action: changes.status === 'Completed' ? 'completed' : 'status', from: followUp.status, to: changes.status });
  } else if (!isRescheduling && remarkText) {
    history.push({ ...entry, action: 'remark' });
  }

  Object.assign(followUp, changes, { history: history.slice(-100), updated_at: now });
  if (changes.scheduled_date !== undefined) followUp.date = changes.scheduled_date;
  if (changes.scheduled_time !== undefined) followUp.time = changes.scheduled_time;
  if (isCompleting) {
    followUp.completed_at = now;
    followUp.completed_by = req.user.id;
    const due = String(followUp.scheduled_date || '').split('T')[0];
    followUp.completed_late = Boolean(due && now.split('T')[0] > due);
  }
  dbSync.saveFollowUp(followUp);

  // Keep the linked lead's remark history and next follow-up date in step
  if (followUp.lead_id && (remarkText || isRescheduling)) {
    const lead = dataStore.leads.find((l) => l.id === followUp.lead_id);
    if (lead) {
      if (isRescheduling) lead.follow_up_date = followUp.scheduled_date;
      if (changes.today_remarks) lead.today_remarks = changes.today_remarks;
      if (changes.next_follow_up_action) lead.next_follow_up_action = changes.next_follow_up_action;
      lead.previous_remarks = [
        {
          today_remark: changes.today_remarks || '',
          planned_action: changes.next_follow_up_action || '',
          remark: [
            isCompleting ? 'Follow-up completed' : null,
            isRescheduling ? `Rescheduled to ${followUp.scheduled_date}` : null,
            remarkText ? `Interaction: ${remarkText}` : null,
          ].filter(Boolean).join(' | '),
          follow_up_date: lead.follow_up_date,
          date: now,
          author: req.user.name || 'User',
          author_id: req.user.id,
        },
        ...(lead.previous_remarks || []),
      ];
      lead.updated_at = now;
      dbSync.saveLead(lead);
    }
  }

  return ApiResponse.success(res, withComputed(followUp), 'Follow-up updated successfully');
};

/**
 * Delete follow-up
 */
const deleteFollowUp = async (req, res) => {
  const { id } = req.params;
  if (!isOwnerUser(req.user)) {
    return ApiResponse.error(res, 'Access denied: Only Company Owners can delete follow-ups.', 403);
  }
  const index = dataStore.followUps.findIndex((followUp) => followUp.id === id && isFollowUpInUserScope(followUp, req.user));

  if (index === -1) {
    return ApiResponse.error(res, 'Follow-up not found', 404);
  }

  const deleted = dataStore.followUps.splice(index, 1)[0];
  dbSync.deleteFollowUp(id);

  return ApiResponse.success(res, deleted, 'Follow-up deleted successfully');
};

module.exports = {
  withComputed,
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
};
