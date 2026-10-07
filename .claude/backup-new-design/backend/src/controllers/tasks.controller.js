const ApiResponse = require('../utils/apiResponse');
const { newId, nowIso } = require('../db/tenant');
const { HttpError, text, oneOf, dateOnly, compact, PRIORITIES } = require('../utils/validate');
const { canSeeLead } = require('../services/permissions');
const { usersMap } = require('../services/leads');

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const sanitizeTask = (body, { requireTitle = false } = {}) => {
  const dueTime = body.due_time ?? body.deadline_time;
  if (dueTime !== undefined && dueTime !== '' && !TIME_RE.test(String(dueTime))) {
    throw new HttpError(400, 'Due time must be HH:MM (24-hour)');
  }
  return compact({
    title: text(body.title, { field: 'Title', max: 200, required: requireTitle }),
    description: text(body.description, { field: 'Description', max: 3000 }),
    priority: oneOf(body.priority, PRIORITIES, { field: 'Priority' }),
    status: oneOf(body.status, TASK_STATUSES, { field: 'Status' }),
    due_date: dateOnly(body.due_date, { field: 'Due date' }),
    due_time: dueTime === undefined ? undefined : String(dueTime),
  });
};

/** Staff without tasks_assign only see and manage their own tasks. */
const visibleFilter = (req) => (req.perms.tasks_assign ? {} : { assigned_to: req.user.id });

const loadTask = async (req, id) => {
  const task = await req.db.findOne('tasks', { id, ...visibleFilter(req) });
  if (!task) throw new HttpError(404, 'Task not found');
  return task;
};

const checkLeadLink = async (req, leadId) => {
  if (!leadId) return null;
  const lead = await req.db.findOne('leads', { id: leadId });
  if (!lead || !canSeeLead(req.user, lead)) throw new HttpError(400, 'Linked lead not found');
  return lead;
};

const decorate = (task, users) => ({
  ...task,
  deadline_time: task.due_time,
  assigned_name: users.get(task.assigned_to)?.name || 'Unassigned',
  created_by_name: users.get(task.created_by)?.name || '',
});

/** GET /tasks */
const getTasks = async (req, res) => {
  const filter = visibleFilter(req);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assigned_to && req.perms.tasks_assign) filter.assigned_to = req.query.assigned_to;
  if (req.query.lead_id) filter.lead_id = req.query.lead_id;
  const [tasks, users] = await Promise.all([
    req.db.find('tasks', filter, { sort: { due_date: 1 } }),
    usersMap(req.db),
  ]);
  return ApiResponse.success(res, tasks.map((t) => decorate(t, users)));
};

/** POST /tasks */
const createTask = async (req, res) => {
  const input = sanitizeTask(req.body, { requireTitle: true });
  let assignee = req.user.id;
  if (req.body.assigned_to && req.body.assigned_to !== req.user.id) {
    if (!req.perms.tasks_assign) throw new HttpError(403, 'You can only create tasks for yourself');
    const user = await req.db.findOne('users', { id: req.body.assigned_to });
    if (!user || !user.is_active) throw new HttpError(400, 'Choose an active team member');
    assignee = user.id;
  }
  const lead = await checkLeadLink(req, req.body.lead_id);
  const now = nowIso();
  const task = {
    priority: 'Medium',
    status: 'Pending',
    due_date: now.slice(0, 10),
    due_time: '18:00',
    description: '',
    ...input,
    id: newId('tsk'),
    assigned_to: assignee,
    lead_id: lead ? lead.id : null,
    lead_name: lead ? lead.name : null,
    created_by: req.user.id,
    created_at: now,
    updated_at: now,
  };
  await req.db.insert('tasks', task);
  return ApiResponse.created(res, decorate(task, await usersMap(req.db)), 'Task created');
};

/** PATCH /tasks/:id */
const updateTask = async (req, res) => {
  const task = await loadTask(req, req.params.id);
  const set = sanitizeTask(req.body);
  if (req.body.assigned_to !== undefined && req.body.assigned_to !== task.assigned_to) {
    if (!req.perms.tasks_assign) throw new HttpError(403, 'You cannot reassign tasks');
    const user = await req.db.findOne('users', { id: req.body.assigned_to });
    if (!user || !user.is_active) throw new HttpError(400, 'Choose an active team member');
    set.assigned_to = user.id;
  }
  if (set.status === 'Completed' && task.status !== 'Completed') set.completed_at = nowIso();
  set.updated_at = nowIso();
  const updated = await req.db.update('tasks', { id: task.id }, set);
  return ApiResponse.success(res, decorate(updated, await usersMap(req.db)), 'Task updated');
};

/** DELETE /tasks/:id — the task's creator, or anyone who can assign tasks. */
const deleteTask = async (req, res) => {
  const task = await loadTask(req, req.params.id);
  if (!req.perms.tasks_assign && task.created_by !== req.user.id) {
    throw new HttpError(403, 'You can only delete tasks you created');
  }
  await req.db.remove('tasks', { id: task.id });
  return ApiResponse.success(res, { id: task.id }, 'Task deleted');
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
