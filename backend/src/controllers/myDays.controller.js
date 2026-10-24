const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { getTenantContext } = require('../utils/tenantScope');
const { isOwnerUser, isSuperAdmin } = require('../utils/access');

const canViewMyDays = (user) =>
  isOwnerUser(user) || isSuperAdmin(user) || user?.permissions?.view_mydays !== false;

/** Ids whose My Day entries this user may read: self, or the whole team for an owner. */
const readableUserIds = (user, query = {}) => {
  if (isSuperAdmin(user)) return null;
  if (isOwnerUser(user)) {
    const team = getTenantContext(user).allowedUserIds;
    if (query.user_id) return team.has(query.user_id) ? new Set([query.user_id]) : new Set();
    if (query.scope === 'team') return team;
  }
  return new Set([user.id]);
};

/**
 * Get daily planner items and daily reports.
 *  - Staff: their own.
 *  - Owner: their own, or ?scope=team for the whole team, or ?user_id=<staff id>.
 */
const getMyDays = async (req, res) => {
  if (!canViewMyDays(req.user)) {
    return ApiResponse.error(res, 'Access denied: My Days is not enabled for this account.', 403);
  }
  const ids = readableUserIds(req.user, req.query);
  let list = dataStore.myDays.filter((d) => !ids || ids.has(d.user_id));
  if (req.query.kind) list = list.filter((d) => (d.kind || 'item') === req.query.kind);
  list = list.map((d) => {
    const u = dataStore.users.find((x) => x.id === d.user_id);
    return { ...d, user_name: u ? u.name : (d.user || '') };
  });

  return ApiResponse.success(res, list, 'MyDays retrieved successfully');
};

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};

/**
 * Add a planner item, or a daily report ({ kind: 'report', ... }).
 * A report is always saved for the logged-in user (an owner may log one for their own staff).
 */
const addMyDayItem = async (req, res) => {
  if (!canViewMyDays(req.user)) {
    return ApiResponse.error(res, 'Access denied: My Days is not enabled for this account.', 403);
  }
  const now = new Date().toISOString();

  if (req.body.kind === 'report') {
    const b = req.body;
    let userId = req.user.id;
    if (b.user_id && b.user_id !== req.user.id) {
      const team = isOwnerUser(req.user) ? getTenantContext(req.user).allowedUserIds : new Set();
      if (!team.has(b.user_id)) {
        return ApiResponse.error(res, 'You can only log a daily report for yourself.', 403);
      }
      userId = b.user_id;
    }
    const owner = dataStore.users.find((u) => u.id === userId) || req.user;
    const dateIso = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date_iso || '')) ? b.date_iso : now.split('T')[0];
    const report = {
      id: generateId('report'),
      kind: 'report',
      user_id: userId,
      user: owner.name || '',
      date_iso: dateIso,
      date: b.date || dateIso,
      leads: toInt(b.leads),
      status: toInt(b.status),
      reassign: toInt(b.reassign),
      remarks: toInt(b.remarks),
      summary: String(b.summary || '').slice(0, 2000),
      tasks: Array.isArray(b.tasks) ? b.tasks.slice(0, 50) : [],
      updated: b.updated || '',
      created_by: req.user.id,
      created_at: now,
    };
    dataStore.myDays.push(report);
    dbSync.saveMyDay(report);
    return ApiResponse.created(res, report, 'Daily report saved');
  }

  const { task, text, summary, title, priority, time_slot, category, date } = req.body;
  const taskText = task || text || summary || title;

  if (!taskText) {
    return ApiResponse.error(res, 'Task description is required', 400);
  }

  const newItem = {
    id: generateId('day'),
    kind: 'item',
    user_id: req.user.id,
    task: taskText,
    text: taskText,
    priority: priority || 'medium',
    completed: false,
    time_slot: time_slot || 'Today',
    category: category || 'Work',
    date: date || now.split('T')[0],
    created_at: now,
  };

  dataStore.myDays.push(newItem);
  dbSync.saveMyDay(newItem);

  return ApiResponse.created(res, newItem, 'Item added to MyDays');
};

/**
 * Toggle task completion in MyDays (own items only)
 */
const toggleMyDayItem = async (req, res) => {
  if (!canViewMyDays(req.user)) {
    return ApiResponse.error(res, 'Access denied: My Days is not enabled for this account.', 403);
  }
  const { id } = req.params;
  const item = dataStore.myDays.find((d) => d.id === id);

  if (!item) {
    return ApiResponse.error(res, 'Item not found', 404);
  }
  if (item.user_id !== req.user.id) {
    return ApiResponse.error(res, 'Access denied: You can only update your own planner items.', 403);
  }

  item.completed = !item.completed;
  item.completed_at = item.completed ? new Date().toISOString() : null;
  dbSync.saveMyDay(item);

  return ApiResponse.success(res, item, `Task marked as ${item.completed ? 'completed' : 'pending'}`);
};

/**
 * Delete item: your own planner items; owners can also remove reports of their team.
 */
const deleteMyDayItem = async (req, res) => {
  if (!canViewMyDays(req.user)) {
    return ApiResponse.error(res, 'Access denied: My Days is not enabled for this account.', 403);
  }
  const { id } = req.params;
  const index = dataStore.myDays.findIndex((d) => d.id === id);
  if (index === -1) {
    return ApiResponse.error(res, 'Item not found', 404);
  }
  const item = dataStore.myDays[index];
  const ownItem = item.user_id === req.user.id && (item.kind || 'item') !== 'report';
  const ownerOfTeam =
    isSuperAdmin(req.user) ||
    (isOwnerUser(req.user) && getTenantContext(req.user).allowedUserIds.has(item.user_id));
  if (!ownItem && !ownerOfTeam) {
    return ApiResponse.error(
      res,
      (item.kind || 'item') === 'report' ? 'Only your company owner can remove a submitted daily report.' : 'Access denied: You can only remove your own planner items.',
      403
    );
  }

  const deleted = dataStore.myDays.splice(index, 1)[0];
  dbSync.deleteMyDay(id);

  return ApiResponse.success(res, deleted, 'Item removed from MyDays');
};

module.exports = {
  getMyDays,
  addMyDayItem,
  toggleMyDayItem,
  deleteMyDayItem,
};
