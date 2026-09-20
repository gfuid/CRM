const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');

/**
 * Get outreach tracking matrix
 */
const getOutreachMatrix = async (req, res) => {
  const populated = dataStore.outreach.map((item) => {
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
 * Update daily outreach record for employee
 */
const recordOutreach = async (req, res) => {
  const { employee_id, calls_made, emails_sent, linkedin_touches, meetings_booked } = req.body;
  const targetEmpId = employee_id || (req.user ? req.user.id : 'usr_agent_1');

  const today = new Date().toISOString().split('T')[0];
  let record = dataStore.outreach.find((o) => o.employee_id === targetEmpId && o.date === today);

  if (record) {
    if (calls_made !== undefined) record.calls_made = Number(calls_made);
    if (emails_sent !== undefined) record.emails_sent = Number(emails_sent);
    if (linkedin_touches !== undefined) record.linkedin_touches = Number(linkedin_touches);
    if (meetings_booked !== undefined) record.meetings_booked = Number(meetings_booked);
    record.target_met = record.calls_made >= 30 && record.emails_sent >= 50;
  } else {
    record = {
      id: generateId('out'),
      employee_id: targetEmpId,
      date: today,
      calls_made: Number(calls_made) || 0,
      emails_sent: Number(emails_sent) || 0,
      linkedin_touches: Number(linkedin_touches) || 0,
      meetings_booked: Number(meetings_booked) || 0,
      target_met: (Number(calls_made) || 0) >= 30 && (Number(emails_sent) || 0) >= 50,
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
