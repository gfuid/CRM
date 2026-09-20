const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');

/**
 * Get all tasks with filter
 */
const getTasks = async (req, res) => {
  const { status, priority, assigned_to } = req.query;
  let list = [...dataStore.tasks];

  // Role-Based Isolation: Staff only see their own tasks
  if (req.user && req.user.role !== 'admin') {
    list = list.filter((t) => t.assigned_to === req.user.id);
  } else if (assigned_to) {
    list = list.filter((t) => t.assigned_to === assigned_to);
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
      ...t,
      assigned_name: user ? user.name : 'Unassigned',
      lead_name: lead ? lead.name : null,
    };
  });

  return ApiResponse.success(res, populated, 'Tasks retrieved successfully');
};

/**
 * Create task
 */
const createTask = async (req, res) => {
  const { title, description, priority, due_date, deadline_time, assigned_to, lead_id } = req.body;

  if (!title) {
    return ApiResponse.error(res, 'Task title is required', 400);
  }

  const finalAssignedTo = (req.user && req.user.role !== 'admin')
    ? req.user.id
    : (assigned_to || (req.user ? req.user.id : 'usr_athish'));

  const newTask = {
    id: generateId('tsk'),
    title,
    description: description || '',
    priority: priority || 'Medium',
    status: 'Pending',
    due_date: due_date || new Date(Date.now() + 86400000).toISOString(),
    deadline_time: deadline_time || '18:00',
    assigned_to: finalAssignedTo,
    lead_id: lead_id || null,
    created_at: new Date().toISOString(),
  };

  dataStore.tasks.unshift(newTask);
  dbSync.saveTask(newTask);

  return ApiResponse.created(res, newTask, 'Task created successfully');
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

  // Non-admins can only update their own tasks
  if (req.user && req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
    return ApiResponse.error(res, 'Access denied: You cannot edit another employee\'s task.', 403);
  }

  Object.assign(task, req.body, { updated_at: new Date().toISOString() });
  dbSync.saveTask(task);

  return ApiResponse.success(res, task, 'Task updated successfully');
};

/**
 * Delete task
 */
const deleteTask = async (req, res) => {
  const { id } = req.params;

  if (req.user && req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Access denied: Only Company Owner can delete tasks.', 403);
  }

  const index = dataStore.tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return ApiResponse.error(res, 'Task not found', 404);
  }

  dataStore.tasks.splice(index, 1);
  dbSync.deleteTask(id);

  return ApiResponse.success(res, null, 'Task deleted successfully');
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
