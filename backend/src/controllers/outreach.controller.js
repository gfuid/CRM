const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { getTenantContext } = require('../utils/tenantScope');
const { isOwnerUser, isSuperAdmin, todayISO, viewBlocked } = require('../utils/access');

/** Which employee ids this user may see in the outreach matrix. null = everyone (Super Admin). */
const visibleEmployeeIds = (user) => {
  if (isSuperAdmin(user)) return null;
  const ctx = getTenantContext(user);
  if (isOwnerUser(user) || user.data_scope === 'all') return ctx.allowedUserIds;
  return new Set([user.id]);
};

/**
 * Get outreach tracking matrix (only your own company)
 */
const getOutreachMatrix = async (req, res) => {
  if (viewBlocked(req.user, 'view_outreach')) {
    return ApiResponse.error(res, 'Access denied: Your company owner has not given you access to Outreach.', 403);
  }
  const visible = visibleEmployeeIds(req.user);
  const populated = dataStore.outreach
    .filter((item) => !visible || visible.has(item.employee_id))
    .map((item) => {
      const emp = dataStore.users.find((u) => u.id === item.employee_id);
      return {
        ...item,
        employee_name: emp ? emp.name : 'Unknown Employee',
        employee_avatar: emp ? emp.avatar_url : null,
        department: emp ? emp.department : 'Outreach',
      };
    });

  return ApiResponse.success(res, populated, 'Outreach matrix retrieved successfully');
};

/**
 * Update daily outreach record.
 * Staff can only record their own numbers; an owner can record for their own staff.
 */
const recordOutreach = async (req, res) => {
  if (viewBlocked(req.user, 'view_outreach')) {
    return ApiResponse.error(res, 'Access denied: Your company owner has not given you access to Outreach.', 403);
  }
  const { employee_id, calls_made, emails_sent, linkedin_touches, meetings_booked } = req.body;
  const targetEmpId = employee_id || req.user.id;

  if (!isSuperAdmin(req.user)) {
    if (!isOwnerUser(req.user) && targetEmpId !== req.user.id) {
      return ApiResponse.error(res, 'You can only record your own outreach numbers.', 403);
    }
    if (isOwnerUser(req.user) && !getTenantContext(req.user).allowedUserIds.has(targetEmpId)) {
      return ApiResponse.error(res, 'This employee does not belong to your organization.', 403);
    }
  }

  const nums = { calls_made, emails_sent, linkedin_touches, meetings_booked };
  for (const [key, value] of Object.entries(nums)) {
    if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      return ApiResponse.error(res, `${key} must be a number of 0 or more`, 400);
    }
  }

  const today = todayISO();
  let record = dataStore.outreach.find((o) => o.employee_id === targetEmpId && o.date === today);
  const now = new Date().toISOString();

  if (record) {
    if (calls_made !== undefined) record.calls_made = Number(calls_made);
    if (emails_sent !== undefined) record.emails_sent = Number(emails_sent);
    if (linkedin_touches !== undefined) record.linkedin_touches = Number(linkedin_touches);
    if (meetings_booked !== undefined) record.meetings_booked = Number(meetings_booked);
    record.target_met = record.calls_made >= 30 && record.emails_sent >= 50;
    record.updated_at = now;
    record.updated_by = req.user.id;
  } else {
    record = {
      id: generateId('out'),
      employee_id: targetEmpId,
      company_id: req.user.company_id || '',
      date: today,
      calls_made: Number(calls_made) || 0,
      emails_sent: Number(emails_sent) || 0,
      linkedin_touches: Number(linkedin_touches) || 0,
      meetings_booked: Number(meetings_booked) || 0,
      target_met: (Number(calls_made) || 0) >= 30 && (Number(emails_sent) || 0) >= 50,
      created_at: now,
      updated_by: req.user.id,
    };
    dataStore.outreach.unshift(record);
  }

  dbSync.saveOutreach(record);

  return ApiResponse.success(res, record, 'Outreach metrics saved successfully');
};

module.exports = {
  getOutreachMatrix,
  recordOutreach,
};
