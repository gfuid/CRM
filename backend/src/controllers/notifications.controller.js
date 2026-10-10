const ApiResponse = require('../utils/apiResponse');
const { dataStore, dbSync } = require('../repositories/dataStore');

/**
 * Get active notifications for current user / owner
 */
const getUserNotifications = async (req, res) => {
  const user = req.user || { id: req.headers['x-user-id'] || 'anonymous', persona: 'owner', role: 'admin' };
  const isOwner = user.persona === 'owner' || user.role === 'admin';

  const allNotifs = dataStore.notifications || [];

  // Filter relevant notifications
  const userNotifs = allNotifs
    .filter((n) => {
      if (n.target === 'all') return true;
      if (n.target === 'all_owners' && isOwner) return true;
      if (n.target_user_id === user.id) return true;
      return false;
    })
    .map((n) => ({
      ...n,
      is_read: Array.isArray(n.read_by) && n.read_by.includes(user.id),
    }));

  return ApiResponse.success(res, userNotifs, 'Notifications retrieved successfully');
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  const { id } = req.params;
  const user = req.user || { id: req.headers['x-user-id'] || 'anonymous' };

  const notif = (dataStore.notifications || []).find((n) => n.id === id);
  if (!notif) {
    return ApiResponse.error(res, 'Notification not found', 404);
  }

  if (!Array.isArray(notif.read_by)) {
    notif.read_by = [];
  }
  if (!notif.read_by.includes(user.id)) {
    notif.read_by.push(user.id);
    dbSync.saveNotification(notif);
  }

  return ApiResponse.success(res, { ...notif, is_read: true }, 'Notification marked as read');
};

/**
 * Mark all notifications as read for current user
 */
const markAllAsRead = async (req, res) => {
  const user = req.user || { id: req.headers['x-user-id'] || 'anonymous' };
  const allNotifs = dataStore.notifications || [];

  allNotifs.forEach((n) => {
    if (!Array.isArray(n.read_by)) n.read_by = [];
    if (!n.read_by.includes(user.id)) {
      n.read_by.push(user.id);
      dbSync.saveNotification(n);
    }
  });

  return ApiResponse.success(res, null, 'All notifications marked as read');
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
