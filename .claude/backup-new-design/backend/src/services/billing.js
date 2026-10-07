const { store } = require('../db/store');
const { PLATFORM_DEFAULTS } = require('../config/defaults');

const DAY_MS = 86400000;

const getPlatformSettings = async () => {
  const doc = await store.findOne('meta', { id: 'platform_settings' });
  return { ...PLATFORM_DEFAULTS, ...(doc ? doc.value : {}) };
};

const savePlatformSettings = async (value) => {
  const existing = await store.findOne('meta', { id: 'platform_settings' });
  if (existing) await store.updateOne('meta', { id: 'platform_settings' }, { value });
  else await store.insertOne('meta', { id: 'platform_settings', value });
  return getPlatformSettings();
};

/**
 * Seat and subscription state for a company.
 * Paid seats count only while the subscription is active; free seats always count.
 */
const billingSummary = (company, platform, staffUsed = 0) => {
  const freeSeats = company.seats_free ?? platform.free_seats;
  const paidSeats = company.seats_paid || 0;
  const endsAt = company.subscription_ends_at || null;
  const now = Date.now();
  const msLeft = endsAt ? Date.parse(endsAt) - now : null;
  const daysLeft = msLeft === null ? null : Math.ceil(msLeft / DAY_MS);

  let status = 'free';
  if (paidSeats > 0) {
    if (!endsAt || msLeft <= 0) status = 'expired';
    else if (daysLeft <= platform.reminder_days_before_expiry) status = 'expiring';
    else status = 'active';
  }
  const paidActive = status === 'active' || status === 'expiring';
  const seatLimit = freeSeats + (paidActive ? paidSeats : 0);

  return {
    seats_free: freeSeats,
    seats_paid: paidSeats,
    seat_limit: seatLimit,
    staff_used: staffUsed,
    seats_available: Math.max(0, seatLimit - staffUsed),
    over_limit: staffUsed > seatLimit,
    subscription_status: status,
    subscription_ends_at: endsAt,
    days_left: daysLeft,
    price_per_seat_monthly: platform.price_per_seat_monthly,
    currency: platform.currency,
    monthly_amount: paidSeats * platform.price_per_seat_monthly,
  };
};

/** Active employees (owner excluded) — the number that uses seats. */
const countActiveStaff = (companyId) =>
  store.count('users', { company_id: companyId, is_active: true, role: { $ne: 'owner' } });

const companyBilling = async (company) => {
  const [platform, staffUsed] = await Promise.all([getPlatformSettings(), countActiveStaff(company.id)]);
  return billingSummary(company, platform, staffUsed);
};

module.exports = {
  getPlatformSettings,
  savePlatformSettings,
  billingSummary,
  countActiveStaff,
  companyBilling,
  DAY_MS,
};
