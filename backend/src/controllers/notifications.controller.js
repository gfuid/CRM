const ApiResponse = require('../utils/apiResponse');
const { dataStore, dbSync } = require('../repositories/dataStore');
const { isOwnerUser } = require('../utils/access');

const joinedAt = (user) => {
  const stored = (dataStore.users || []).find((u) => u.id === user.id);
  const t = Date.parse((stored && stored.created_at) || user.created_at || '');
  return Number.isFinite(t) ? t : 0;
};

const isVisibleToUser = (notification, user) => {
  if (notification.target_user_id === user.id) return true;
  const broadcast = notification.target === 'all' || (notification.target === 'all_owners' && isOwnerUser(user));
  if (!broadcast) return false;
  // A company that joined later does not see announcements sent before it existed
  const sent = Date.parse(notification.created_at || '');
  return !Number.isFinite(sent) || sent >= joinedAt(user);
};

/** What a user receives: never the list of other people who read it. */
const forUser = (n, user) => {
  const { read_by: readBy, ...rest } = n;
  return { ...rest, is_read: Array.isArray(readBy) && readBy.includes(user.id) };
};

/**
 * Get active notifications for current user / owner
 */
const getUserNotifications = async (req, res) => {
  const user = req.user;

  const allNotifs = dataStore.notifications || [];

  // Filter relevant notifications
  const userNotifs = allNotifs
    .filter((notification) => isVisibleToUser(notification, user))
    .map((n) => forUser(n, user));

  return ApiResponse.success(res, userNotifs, 'Notifications retrieved successfully');
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const notif = (dataStore.notifications || []).find((n) => n.id === id);
  if (!notif) {
    return ApiResponse.error(res, 'Notification not found', 404);
  }
  if (!isVisibleToUser(notif, user)) {
    return ApiResponse.error(res, 'Notification not found', 404);
  }

  if (!Array.isArray(notif.read_by)) {
    notif.read_by = [];
  }
  if (!notif.read_by.includes(user.id)) {
    notif.read_by.push(user.id);
    dbSync.saveNotification(notif);
  }

  return ApiResponse.success(res, forUser(notif, user), 'Notification marked as read');
};

/**
 * Mark all notifications as read for current user
 */
const markAllAsRead = async (req, res) => {
  const user = req.user;
  const allNotifs = dataStore.notifications || [];

  allNotifs.forEach((n) => {
    if (!isVisibleToUser(n, user)) return;
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
