/**
 * In-app notifications for company users: messages sent from the platform admin console,
 * plus automatic subscription reminders for owners.
 */
const ApiResponse = require('../utils/apiResponse');
const { store } = require('../db/store');
const { HttpError } = require('../utils/validate');
const { companyBilling } = require('../services/billing');
const { isOwner } = require('../services/permissions');

const visibleFilter = (req) => ({
  company_id: { $in: [null, req.company.id] },
  audience: { $in: isOwner(req.user) ? ['owners', 'everyone'] : ['everyone'] },
});

const billingReminder = (billing) => {
  if (billing.subscription_status === 'expiring') {
    return {
      id: 'billing_expiring',
      type: 'billing',
      title: `Subscription ends in ${billing.days_left} day${billing.days_left === 1 ? '' : 's'}`,
      message: `Your ${billing.seats_paid} paid employee seat${billing.seats_paid === 1 ? '' : 's'} renew on ${billing.subscription_ends_at.slice(0, 10)}. Renew to keep every employee working.`,
      created_at: new Date().toISOString(),
      read: false,
      system: true,
    };
  }
  if (billing.subscription_status === 'expired') {
    return {
      id: 'billing_expired',
      type: 'warning',
      title: 'Subscription has ended',
      message: `Only ${billing.seats_free} free employee seats are active now. Renew to add or reactivate more employees.`,
      created_at: new Date().toISOString(),
      read: false,
      system: true,
    };
  }
  return null;
};

/** GET /notifications */
const listNotifications = async (req, res) => {
  const rows = await store.find('notifications', visibleFilter(req), { sort: { created_at: -1 }, limit: 50 });
  const items = rows.map(({ read_by = [], ...n }) => ({ ...n, read: read_by.includes(req.user.id) }));
  if (isOwner(req.user)) {
    const reminder = billingReminder(await companyBilling(req.company));
    if (reminder) items.unshift(reminder);
  }
  return ApiResponse.success(res, { items, unread: items.filter((n) => !n.read).length });
};

const markRead = async (req, n) => {
  const readBy = new Set(n.read_by || []);
  if (readBy.has(req.user.id)) return;
  readBy.add(req.user.id);
  await store.updateOne('notifications', { id: n.id }, { read_by: [...readBy] });
};

/** POST /notifications/:id/read */
const readOne = async (req, res) => {
  const n = await store.findOne('notifications', { id: req.params.id, ...visibleFilter(req) });
  if (!n) throw new HttpError(404, 'Notification not found');
  await markRead(req, n);
  return ApiResponse.success(res, null, 'Marked as read');
};

/** POST /notifications/read-all */
const readAll = async (req, res) => {
  const rows = await store.find('notifications', visibleFilter(req), { limit: 200 });
  for (const n of rows) await markRead(req, n);
  return ApiResponse.success(res, null, 'All marked as read');
};

module.exports = { listNotifications, readOne, readAll };
