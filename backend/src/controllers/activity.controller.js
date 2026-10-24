const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { isLeadInUserScope } = require('../utils/tenantScope');
const { isOwnerUser, isSuperAdmin, viewBlocked } = require('../utils/access');

/**
 * Get all activities (chronological timeline)
 */
const getActivities = async (req, res) => {
  if (viewBlocked(req.user, 'view_activity')) {
    return ApiResponse.error(res, 'Access denied: Your company owner has not given you access to Activity.', 403);
  }
  const { type, lead_id } = req.query;
  let list = [...dataStore.activities];

  // Strict Tenant Isolation: only return activities belonging to the user's organization/leads
  if (req.user && req.user.id !== 'usr_super_admin') {
    const { getTenantContext, isLeadInUserScope } = require('../utils/tenantScope');
    const ctx = getTenantContext(req.user);
    list = list.filter((a) => {
      if (a.lead_id) {
        const lead = dataStore.leads.find((l) => l.id === a.lead_id);
        if (lead) return isLeadInUserScope(lead, req.user);
      }
      return ctx.allowedUserIds ? ctx.allowedUserIds.has(a.user_id) : true;
    });
  }

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
  if (lead_id) {
    const lead = dataStore.leads.find((item) => item.id === lead_id);
    if (!lead || !isLeadInUserScope(lead, req.user)) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }
    if (!isOwnerUser(req.user) && !isSuperAdmin(req.user) && lead.assigned_to !== req.user.id) {
      return ApiResponse.error(res, 'You can only log activity for your own assigned leads.', 403);
    }
  }

  const newActivity = {
    id: generateId('act'),
    type: type || 'note',
    title,
    description: description || '',
    lead_id: lead_id || null,
    user_id: req.user.id,
    duration_minutes: duration_minutes ? Number(duration_minutes) : null,
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  dataStore.activities.unshift(newActivity);
  dbSync.saveActivity(newActivity);

  return ApiResponse.created(res, newActivity, 'Activity logged successfully');
};

module.exports = {
  getActivities,
  createActivity,
};
