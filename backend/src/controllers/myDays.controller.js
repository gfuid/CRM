const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');

/**
 * Get current user's daily planner tasks
 */
const getMyDays = async (req, res) => {
  const userId = req.user ? req.user.id : 'usr_admin_1';
  const list = dataStore.myDays.filter((d) => d.user_id === userId);

  return ApiResponse.success(res, list, 'MyDays retrieved successfully');
};

/**
 * Add a new item to MyDays planner
 */
const addMyDayItem = async (req, res) => {
  const { task, priority, time_slot, category } = req.body;

  if (!task) {
    return ApiResponse.error(res, 'Task description is required', 400);
  }

  const newItem = {
    id: generateId('day'),
    user_id: req.user ? req.user.id : 'usr_admin_1',
    task,
    priority: priority || 'medium',
    completed: false,
    time_slot: time_slot || 'Today',
    category: category || 'Work',
  };

  dataStore.myDays.push(newItem);
  dbSync.saveMyDay(newItem);

  return ApiResponse.created(res, newItem, 'Item added to MyDays');
};

/**
 * Toggle task completion in MyDays
 */
const toggleMyDayItem = async (req, res) => {
  const { id } = req.params;
  const item = dataStore.myDays.find((d) => d.id === id);

  if (!item) {
    return ApiResponse.error(res, 'Item not found', 404);
  }

  item.completed = !item.completed;
  dbSync.saveMyDay(item);

  return ApiResponse.success(res, item, `Task marked as ${item.completed ? 'completed' : 'pending'}`);
};

/**
 * Delete item
 */
const deleteMyDayItem = async (req, res) => {
  const { id } = req.params;
  const index = dataStore.myDays.findIndex((d) => d.id === id);

  if (index === -1) {
    return ApiResponse.error(res, 'Item not found', 404);
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
