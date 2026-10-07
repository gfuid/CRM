const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');

/**
 * Get all follow-ups
 */
const getFollowUps = async (req, res) => {
  const { status, assigned_to } = req.query;
  let list = [...dataStore.followUps];

  // Role-Based Isolation: Staff only see their own follow-ups
  if (req.user && req.user.role !== 'admin') {
    list = list.filter((f) => f.assigned_to === req.user.id);
  } else if (assigned_to) {
    list = list.filter((f) => f.assigned_to === assigned_to);
  }

  if (status) {
    list = list.filter((f) => f.status.toLowerCase() === status.toLowerCase());
  }

  const populated = list.map((f) => {
    const user = dataStore.users.find((u) => u.id === f.assigned_to);
    return {
      ...f,
      assigned_name: user ? user.name : 'Unassigned',
    };
  });

  return ApiResponse.success(res, populated, 'Follow-ups retrieved successfully');
};

/**
 * Create new follow-up
 */
const createFollowUp = async (req, res) => {
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

  const finalAssignedTo = (req.user && req.user.role !== 'admin')
    ? req.user.id
    : (assigned_to || (req.user ? req.user.id : 'usr_athish'));

  const newFollowUp = {
    id: generateId('flw'),
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
    status: req.body.status || 'Scheduled',
    assigned_to: finalAssignedTo,
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
      };
      lead.previous_remarks = [newRemarkHistory, ...(lead.previous_remarks || [])];
      dbSync.saveLead(lead);
    }
  }

  return ApiResponse.created(res, newFollowUp, 'Follow-up scheduled successfully');
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

  if (req.user && req.user.role !== 'admin' && followUp.assigned_to !== req.user.id) {
    return ApiResponse.error(res, 'Access denied: You cannot edit another employee\'s follow-up.', 403);
  }

  Object.assign(followUp, req.body);
  dbSync.saveFollowUp(followUp);

  return ApiResponse.success(res, followUp, 'Follow-up updated successfully');
};

/**
 * Delete follow-up
 */
const deleteFollowUp = async (req, res) => {
  const { id } = req.params;
  const index = dataStore.followUps.findIndex((f) => f.id === id);

  if (index === -1) {
    return ApiResponse.error(res, 'Follow-up not found', 404);
  }

  const deleted = dataStore.followUps.splice(index, 1)[0];
  dbSync.deleteFollowUp(id);

  return ApiResponse.success(res, deleted, 'Follow-up deleted successfully');
};

module.exports = {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
};
