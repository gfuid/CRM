/**
 * Central access helpers so every controller applies the same rules.
 *
 * Roles in this product:
 *  - Super Admin  : the platform operator (virtual user `usr_super_admin`)
 *  - Owner        : a company owner (persona 'owner')
 *  - Staff        : an employee created by an owner (persona 'staff')
 */

const SUPER_ADMIN_ID = 'usr_super_admin';

const isSuperAdmin = (user) => Boolean(user && user.id === SUPER_ADMIN_ID);

/** A company owner. A staff record is never treated as owner, whatever its role says. */
const isOwnerUser = (user) => {
  if (!user || isSuperAdmin(user)) return false;
  if (user.persona === 'staff') return false;
  return user.persona === 'owner' || user.role === 'admin';
};

const isStaffUser = (user) => Boolean(user) && !isSuperAdmin(user) && !isOwnerUser(user);

/** Owner id a user belongs to (owner → self, staff → creator). */
const ownerIdOf = (user) => {
  if (!user) return null;
  if (isOwnerUser(user)) return user.id;
  return user.created_by || user.company_id || user.id;
};

/**
 * True when `target` is a staff member that belongs to `owner`.
 * Matches on created_by (id or email) or a non-generic company_id.
 */
const GENERIC_COMPANY_IDS = new Set(['', 'comp_1', 'comp_traveltrade_1', 'comp_stellarsync_1', 'comp_default']);
const staffBelongsToOwner = (target, owner) => {
  if (!target || !owner || target.id === owner.id) return false;
  if (target.persona === 'owner') return false;
  if (target.created_by) {
    const cb = String(target.created_by).toLowerCase();
    return target.created_by === owner.id || (owner.email && cb === String(owner.email).toLowerCase());
  }
  return Boolean(
    owner.company_id &&
      !GENERIC_COMPANY_IDS.has(owner.company_id) &&
      target.company_id === owner.company_id
  );
};

/** Values that should be treated as "not changed" when a client re-sends a whole record. */
const sameValue = (a, b) => {
  if (a === b) return true;
  if ((a === undefined || a === null || a === '') && (b === undefined || b === null || b === '')) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

// Business time zone for "today", deadlines and overdue checks (the server itself runs in UTC).
// Set BUSINESS_TZ_OFFSET on the server to change it, e.g. "+05:30" (India, default) or "+04:00".
const TZ_OFFSET = /^[+-]\d{2}:\d{2}$/.test(String(process.env.BUSINESS_TZ_OFFSET || '')) ? process.env.BUSINESS_TZ_OFFSET : '+05:30';
const tzOffsetMinutes = () => {
  const sign = TZ_OFFSET.startsWith('-') ? -1 : 1;
  const [h, m] = TZ_OFFSET.slice(1).split(':').map(Number);
  return sign * (h * 60 + m);
};
/** True when the owner switched this section off for a staff member (permissions.view_* === false). */
const viewBlocked = (user, key) => isStaffUser(user) && Boolean(user.permissions) && user.permissions[key] === false;

/** Today's date (YYYY-MM-DD) in the business time zone. */
const todayISO = () => new Date(Date.now() + tzOffsetMinutes() * 60000).toISOString().split('T')[0];
/** A business-local date + "HH:MM" as a real Date. */
const localDateTime = (day, time = '23:59') => {
  const d = new Date(`${day}T${String(time).padStart(5, '0')}:00${TZ_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

module.exports = {
  SUPER_ADMIN_ID,
  GENERIC_COMPANY_IDS,
  isSuperAdmin,
  isOwnerUser,
  isStaffUser,
  ownerIdOf,
  staffBelongsToOwner,
  sameValue,
  todayISO,
  viewBlocked,
  localDateTime,
  TZ_OFFSET,
};
