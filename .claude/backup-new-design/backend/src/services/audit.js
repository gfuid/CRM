const { newId, nowIso } = require('../db/tenant');

/**
 * Appends an entry to the company's audit log. Audit failures never block the action,
 * but they are logged so they can be noticed.
 */
const audit = async (req, action, details, extra = {}) => {
  try {
    await req.db.insert('auditLogs', {
      id: newId('log'),
      actor_id: req.user.id,
      actor_name: req.user.name,
      action,
      details,
      ...extra,
      ip_address: req.ip,
      timestamp: nowIso(),
    });
  } catch (err) {
    console.error('[audit] failed to write entry', action, err.message);
  }
};

module.exports = { audit };
