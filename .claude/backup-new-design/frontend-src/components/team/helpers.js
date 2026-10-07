/** Small helpers shared by the Team and Settings screens. */
import { formatDate, formatMoney } from '../../lib/format';

// No look-alike characters (0/O/o, 1/l/I) so a password read out over the phone is typed correctly
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALL = LOWER + UPPER + DIGITS;

const randomIndex = (max) => {
  // Rejection sampling keeps every character equally likely
  const limit = Math.floor(256 / max) * max;
  const buf = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
};

const pick = (chars) => chars[randomIndex(chars.length)];

/** Random, easy-to-read 10 character password with at least one lower, upper and digit. */
export function generatePassword(length = 10) {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const COPY_BLOCKED = 'Your browser blocked copying. Select the text and copy it yourself.';

/** Copies text to the clipboard; throws a readable error when the browser blocks it. */
export async function copyText(text) {
  if (!navigator.clipboard?.writeText) throw new Error(COPY_BLOCKED);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    throw new Error(COPY_BLOCKED);
  }
}

export const signInUrl = () => `${window.location.origin}/login`;

/** The message the owner pastes into WhatsApp / email for a new or reset login. */
export const signInMessage = ({ name, email, password, companyName }) =>
  [
    `Hi ${name.split(/\s+/)[0] || name}, here are your sign-in details${companyName ? ` for ${companyName}` : ''}:`,
    `Sign-in page: ${signInUrl()}`,
    `Email: ${email}`,
    `Password: ${password}`,
    'You can change your password after you sign in: tap your picture at the top right, then Profile & password.',
  ].join('\n');

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD = 6;
export const MAX_PASSWORD = 128;

/** Staff roles the owner can give, with a one-line plain explanation each. */
export const ROLE_CHOICES = [
  { value: 'agent', label: 'Sales staff', text: 'Works on their own leads and tasks, and sees only their own numbers.' },
  { value: 'manager', label: 'Manager', text: 'Sees all company leads and reports, and can give leads and tasks to others.' },
];

/** Owner first, then active employees, then deactivated ones (each group by name). */
export const sortMembers = (members) =>
  [...members].sort((a, b) => {
    const rank = (m) => (m.role === 'owner' ? 0 : m.is_active ? 1 : 2);
    return rank(a) - rank(b) || (a.name || '').localeCompare(b.name || '');
  });

/** Effective value of one permission: the owner's override if set, otherwise the role default. */
export const effectivePermission = (key, overrides, roleDefaults) =>
  overrides && Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : roleDefaults?.[key];

/** Keeps only overrides that differ from the role's defaults, so "custom" really means custom. */
export const cleanOverrides = (overrides, roleDefaults) =>
  Object.fromEntries(Object.entries(overrides || {}).filter(([key, value]) => roleDefaults?.[key] !== value));

/** True when two permission override maps hold the same keys and values. */
export const sameOverrides = (a, b) => {
  const left = Object.entries(a || {});
  const right = b || {};
  return left.length === Object.keys(right).length && left.every(([key, value]) => Object.prototype.hasOwnProperty.call(right, key) && right[key] === value);
};

/** One plain sentence about the paid subscription. */
export function subscriptionText(billing) {
  if (!billing) return '';
  const end = billing.subscription_ends_at ? formatDate(billing.subscription_ends_at) : null;
  const daysLeft = plural(Math.max(0, billing.days_left ?? 0), 'day');
  switch (billing.subscription_status) {
    case 'active':
      return end ? `Paid seats are active until ${end}.` : 'Paid seats are active.';
    case 'expiring':
      return end
        ? `Paid seats end on ${end} (${daysLeft} left). Contact your account manager to renew.`
        : `Paid seats end in ${daysLeft}. Contact your account manager to renew.`;
    case 'expired':
      return end
        ? `Paid seats ended on ${end}. Only free seats count until you renew.`
        : 'Paid seats are not active. Only free seats count until you renew.';
    default:
      return 'You are using free seats only.';
  }
}

export const seatPrice = (billing) => `${formatMoney(billing.price_per_seat_monthly, billing.currency || 'INR')} per month`;
