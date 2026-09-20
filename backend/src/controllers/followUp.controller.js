const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');

/**
 * Get all follow-ups
 */
const getFollowUps = async (req, res) => {
  const { status, assigned_to } = req.query;
  let list = [...dataStore.followUps];

  if (status) {
    list = list.filter((f) => f.status.toLowerCase() === status.toLowerCase());
  }
  if (assigned_to) {
    list = list.filter((f) => f.assigned_to === assigned_to);
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
  const { lead_id, client_name, company, scheduled_date, scheduled_time, type, agenda, assigned_to } = req.body;

  if (!client_name || !scheduled_date) {
    return ApiResponse.error(res, 'Client name and scheduled date are required', 400);
  }

  const newFollowUp = {
    id: generateId('flw'),
    lead_id: lead_id || null,
    client_name,
    company: company || '',
    scheduled_date,
    scheduled_time: scheduled_time || '10:00 AM',
    type: type || 'Phone Call',
    agenda: agenda || 'General Follow-up',
    status: 'Scheduled',
    assigned_to: assigned_to || (req.user ? req.user.id : 'usr_agent_1'),
  };

  dataStore.followUps.unshift(newFollowUp);
  dbSync.saveFollowUp(newFollowUp);

  return ApiResponse.created(res, newFollowUp, 'Follow-up scheduled successfully');
};

/**
 * Update follow-up status
 */
const updateFollowUp = async (req, res) => {
  const { id } = req.params;
  const index = dataStore.followUps.findIndex((f) => f.id === id);

  if (index === -1) {
    return ApiResponse.error(res, 'Follow-up not found', 404);
  }

  const updated = {
    ...dataStore.followUps[index],
    ...req.body,
  };

  dataStore.followUps[index] = updated;
  dbSync.saveFollowUp(updated);

  return ApiResponse.success(res, updated, 'Follow-up updated successfully');
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
