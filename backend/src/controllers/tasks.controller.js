const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { getTenantContext, isLeadInUserScope } = require('../utils/tenantScope');

const { isOwnerUser: isCompanyOwner, isSuperAdmin, sameValue, localDateTime, viewBlocked } = require('../utils/access');

const isOwnerUser = (user) => isCompanyOwner(user) || isSuperAdmin(user);
const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
const OWNER_TASK_FIELDS = ['title', 'description', 'priority', 'status', 'due_date', 'deadline_time', 'due_time', 'assigned_to', 'lead_id', 'completion_notes', 'remarks'];
const STAFF_TASK_FIELDS = ['status', 'completion_notes', 'remarks'];
// Staff can move work forward only: Pending -> In Progress -> Completed
const STAFF_STATUS_FLOW = {
  Pending: ['In Progress', 'Completed'],
  'In Progress': ['Completed', 'Pending'],
  Completed: [],
  Cancelled: [],
};

/** Deadline of a task as a Date (due_date + deadline_time, local server time). */
const taskDeadline = (task) => {
  if (!task || !task.due_date) return null;
  const day = String(task.due_date).split('T')[0];
  const time = /^\d{1,2}:\d{2}$/.test(String(task.deadline_time || task.due_time || '')) ? (task.deadline_time || task.due_time) : '23:59';
  return localDateTime(day, time);
};

const withComputed = (task) => {
  const deadline = taskDeadline(task);
  const open = task.status !== 'Completed' && task.status !== 'Cancelled';
  return {
    ...task,
    is_overdue: Boolean(open && deadline && deadline.getTime() < Date.now()),
  };
};

const isTaskInUserScope = (task, user) => {
  const ctx = getTenantContext(user);
  if (ctx.isSuperAdmin) return true;
  if (!isOwnerUser(user)) return task.assigned_to === user.id || task.created_by_id === user.id;
  if (task.company_id && (task.company_id === ctx.companyId || task.company_id === ctx.ownerId)) return true;
  if (task.owner_id === ctx.ownerId) return true;
  if (task.assigned_to && ctx.allowedUserIds.has(task.assigned_to)) return true;
  if (task.created_by_id && ctx.allowedUserIds.has(task.created_by_id)) return true;
  const lead = task.lead_id && dataStore.leads.find((item) => item.id === task.lead_id);
  return !!lead && isLeadInUserScope(lead, user);
};

const isValidDate = (value) => !Number.isNaN(new Date(value).getTime());

/**
 * Get all tasks with filter
 */
const getTasks = async (req, res) => {
  if (viewBlocked(req.user, 'view_tasks')) {
    return ApiResponse.error(res, 'Access denied: Your company owner has not given you access to Tasks.', 403);
  }
  const { status, priority, assigned_to } = req.query;
  let list = [...dataStore.tasks];

  const ctx = getTenantContext(req.user);
  if (!ctx.isSuperAdmin) {
    list = list.filter((task) => isTaskInUserScope(task, req.user));
  }
  if (!isOwnerUser(req.user) && assigned_to && assigned_to !== req.user.id) {
    list = [];
  } else if (assigned_to) {
    list = list.filter((task) => task.assigned_to === assigned_to);
  }

  if (status) {
    list = list.filter((t) => t.status.toLowerCase() === status.toLowerCase());
  }
  if (priority) {
    list = list.filter((t) => t.priority.toLowerCase() === priority.toLowerCase());
  }

  // Populate assigned user and lead
  const populated = list.map((t) => {
    const user = dataStore.users.find((u) => u.id === t.assigned_to);
    const lead = dataStore.leads.find((l) => l.id === t.lead_id);
    return {
      ...withComputed(t),
      assigned_name: user ? user.name : (t.assigned_name || 'Unassigned'),
      lead_name: lead ? lead.name : null,
    };
  });

  return ApiResponse.success(res, populated, 'Tasks retrieved successfully');
};

/**
 * Create task
 */
const createTask = async (req, res) => {
  const { title, description, priority, due_date, deadline_time, due_time, assigned_to, lead_id } = req.body;

  if (!title) {
    return ApiResponse.error(res, 'Task title is required', 400);
  }
  if (!isOwnerUser(req.user) && req.user?.permissions?.can_create === false) {
    return ApiResponse.error(res, 'Access denied: You do not have permission to create tasks.', 403);
  }
  if (due_date && !isValidDate(due_date)) {
    return ApiResponse.error(res, 'Task due date is invalid', 400);
  }

  // Staff may create tasks for themselves (personal to-dos, correction requests). Only owners assign work to others.
  if (!isOwnerUser(req.user) && assigned_to && assigned_to !== req.user.id) {
    return ApiResponse.error(res, 'Staff can only create tasks for themselves. Ask your owner to assign work to others.', 403);
  }

  const ctx = getTenantContext(req.user);
  const finalAssignedTo = isOwnerUser(req.user)
    ? (assigned_to || req.user.id)
    : req.user.id;
  if (!ctx.isSuperAdmin && !ctx.allowedUserIds.has(finalAssignedTo)) {
    return ApiResponse.error(res, 'Assigned staff member does not belong to your organization', 400);
  }
  if (lead_id) {
    const lead = dataStore.leads.find((item) => item.id === lead_id);
    if (!lead || !isLeadInUserScope(lead, req.user)) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }
  }

  const finalDueTime = deadline_time || due_time || '18:00';
  const ownerId = ctx.ownerId;

  const newTask = {
    id: generateId('tsk'),
    company_id: ctx.companyId,
    owner_id: ownerId,
    created_by_id: req.user.id,
    title,
    description: description || '',
    priority: priority || 'Medium',
    status: 'Pending',
    due_date: due_date || new Date(Date.now() + 86400000).toISOString(),
    deadline_time: finalDueTime,
    due_time: finalDueTime,
    assigned_to: finalAssignedTo,
    lead_id: lead_id || null,
    is_correction: Boolean(req.body.is_correction) && !isOwnerUser(req.user),
    original_task_id: req.body.is_correction ? (req.body.original_task_id || null) : null,
    status_history: [{ from: null, to: 'Pending', at: new Date().toISOString(), by: req.user.id, by_name: req.user.name || '' }],
    created_at: new Date().toISOString(),
  };

  dataStore.tasks.unshift(newTask);
  dbSync.saveTask(newTask);

  // A correction request from staff is pushed to the owner's notifications
  if (newTask.is_correction && ctx.ownerId) {
    const notif = {
      id: generateId('notif'),
      target: 'specific_user',
      target_user_id: ctx.ownerId,
      target_name: 'Company Owner',
      title: 'Correction request from staff',
      message: `${req.user.name || 'A staff member'}: ${title}`,
      type: 'warning',
      priority: 'high',
      created_at: new Date().toISOString(),
      created_by: req.user.name || 'Staff',
      read_by: [],
    };
    dataStore.notifications.unshift(notif);
    dbSync.saveNotification(notif);
  }

  return ApiResponse.created(res, withComputed(newTask), newTask.is_correction ? 'Correction request sent to your company owner' : 'Task created successfully');
};

/**
 * Update task
 */
const updateTask = async (req, res) => {
  const { id } = req.params;
  const task = dataStore.tasks.find((t) => t.id === id);

  if (!task) {
    return ApiResponse.error(res, 'Task not found', 404);
  }

  if (!isTaskInUserScope(task, req.user)) {
    return ApiResponse.error(res, 'Task not found', 404);
  }

  const owner = isOwnerUser(req.user);
  if (!owner && req.user?.permissions?.can_update === false) {
    return ApiResponse.error(res, 'Access denied: You do not have permission to update tasks.', 403);
  }
  if (!owner && task.assigned_to !== req.user.id) {
    return ApiResponse.error(res, 'Access denied: Only the person the task is assigned to can update it.', 403);
  }

  // Ignore display/server fields the screen sends back (assigned_name, id, created_at, ...); keep only real changes
  const allowedFields = owner ? OWNER_TASK_FIELDS : STAFF_TASK_FIELDS;
  const changes = {};
  const blocked = [];
  for (const [field, value] of Object.entries(req.body || {})) {
    if (!OWNER_TASK_FIELDS.includes(field)) continue;
    if (sameValue(value, task[field])) continue;
    if (field === 'due_date' && value && task.due_date && String(value).split('T')[0] === String(task.due_date).split('T')[0]) continue;
    if (!allowedFields.includes(field)) {
      blocked.push(field);
      continue;
    }
    changes[field] = value;
  }
  if (blocked.length) {
    return ApiResponse.error(res, `Only your company owner can change: ${blocked.join(', ')}. Send a correction request instead.`, 403);
  }
  if (changes.status !== undefined && !TASK_STATUSES.includes(changes.status)) {
    return ApiResponse.error(res, 'Task status is invalid', 400);
  }
  if (!owner && changes.status !== undefined) {
    const allowedNext = STAFF_STATUS_FLOW[task.status || 'Pending'] || [];
    if (!allowedNext.includes(changes.status)) {
      return ApiResponse.error(
        res,
        task.status === 'Completed'
          ? 'This task is already completed. Ask your owner if it needs to be reopened.'
          : `Only your company owner can set a task to "${changes.status}".`,
        403
      );
    }
  }
  if (changes.due_date !== undefined && !isValidDate(changes.due_date)) {
    return ApiResponse.error(res, 'Task due date is invalid', 400);
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
  if (Object.keys(changes).length === 0) {
    return ApiResponse.success(res, withComputed(task), 'No changes to save');
  }

  const now = new Date().toISOString();
  if (changes.status !== undefined && changes.status !== task.status) {
    task.status_history = [
      ...(Array.isArray(task.status_history) ? task.status_history : []),
      { from: task.status || null, to: changes.status, at: now, by: req.user.id, by_name: req.user.name || '' },
    ].slice(-50);
    if (changes.status === 'Completed') {
      const deadline = taskDeadline({ ...task, ...changes });
      task.completed_at = now;
      task.completed_by = req.user.id;
      task.completed_late = Boolean(deadline && deadline.getTime() < Date.now());
    } else if (task.status === 'Completed') {
      task.reopened_at = now;
      task.completed_at = null;
      task.completed_by = null;
      task.completed_late = null;
    }
  }
  Object.assign(task, changes, { updated_at: now });
  dbSync.saveTask(task);

  return ApiResponse.success(res, withComputed(task), 'Task updated successfully');
};

/**
 * Delete task
 */
const deleteTask = async (req, res) => {
  const { id } = req.params;

  if (!isOwnerUser(req.user)) {
    return ApiResponse.error(res, 'Access denied: Only Company Owner can delete tasks.', 403);
  }

  const index = dataStore.tasks.findIndex((t) => t.id === id && isTaskInUserScope(t, req.user));
  if (index === -1) {
    return ApiResponse.error(res, 'Task not found', 404);
  }

  dataStore.tasks.splice(index, 1);
  dbSync.deleteTask(id);

  return ApiResponse.success(res, null, 'Task deleted successfully');
};

module.exports = {
  taskDeadline,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
