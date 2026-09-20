const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');

/**
 * Get all activities (chronological timeline)
 */
const getActivities = async (req, res) => {
  const { type, lead_id } = req.query;
  let list = [...dataStore.activities];

  if (type) {
    list = list.filter((a) => a.type === type);
  }
  if (lead_id) {
    list = list.filter((a) => a.lead_id === lead_id);
  }

  const populated = list.map((a) => {
    const user = dataStore.users.find((u) => u.id === a.user_id);
    const lead = dataStore.leads.find((l) => l.id === a.lead_id);
    return {
      ...a,
      user_name: user ? user.name : 'System',
      user_avatar: user ? user.avatar_url : null,
      lead_name: lead ? lead.name : null,
    };
  });

  return ApiResponse.success(res, populated, 'Activities retrieved successfully');
};

/**
 * Log new activity
 */
const createActivity = async (req, res) => {
  const { type, title, description, lead_id, duration_minutes } = req.body;

  if (!title) {
    return ApiResponse.error(res, 'Activity title is required', 400);
  }

  const newActivity = {
    id: generateId('act'),
    type: type || 'note',
    title,
    description: description || '',
    lead_id: lead_id || null,
    user_id: req.user ? req.user.id : 'usr_agent_1',
    duration_minutes: duration_minutes ? Number(duration_minutes) : null,
    timestamp: new Date().toISOString(),
  };

  dataStore.activities.unshift(newActivity);
  dbSync.saveActivity(newActivity);

  return ApiResponse.created(res, newActivity, 'Activity logged successfully');
};

module.exports = {
  getActivities,
  createActivity,
};
