const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');

/**
 * Get all tasks with filter
 */
const getTasks = async (req, res) => {
  const { status, priority, assigned_to } = req.query;
  let list = [...dataStore.tasks];

  if (status) {
    list = list.filter((t) => t.status.toLowerCase() === status.toLowerCase());
  }
  if (priority) {
    list = list.filter((t) => t.priority.toLowerCase() === priority.toLowerCase());
  }
  if (assigned_to) {
    list = list.filter((t) => t.assigned_to === assigned_to);
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
  const { title, description, priority, due_date, assigned_to, lead_id } = req.body;

  if (!title) {
    return ApiResponse.error(res, 'Task title is required', 400);
  }

  const newTask = {
    id: generateId('tsk'),
    title,
    description: description || '',
    priority: priority || 'Medium',
    status: 'Pending',
    due_date: due_date || new Date(Date.now() + 86400000).toISOString(),
    assigned_to: assigned_to || (req.user ? req.user.id : 'usr_agent_1'),
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
  const taskIndex = dataStore.tasks.findIndex((t) => t.id === id);

  if (taskIndex === -1) {
    return ApiResponse.error(res, 'Task not found', 404);
  }

  const updated = {
    ...dataStore.tasks[taskIndex],
    ...req.body,
  };

  dataStore.tasks[taskIndex] = updated;
  dbSync.saveTask(updated);

  return ApiResponse.success(res, updated, 'Task updated successfully');
};

/**
 * Delete task
 */
const deleteTask = async (req, res) => {
  const { id } = req.params;
  const index = dataStore.tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return ApiResponse.error(res, 'Task not found', 404);
  }

  const deleted = dataStore.tasks.splice(index, 1)[0];
  dbSync.deleteTask(id);

  return ApiResponse.success(res, deleted, 'Task deleted successfully');
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
