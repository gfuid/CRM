/** Local calendar date (YYYY-MM-DD), not UTC. */
export const toLocalDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const localToday = () => toLocalDate(new Date());

export const formatDate = (value, opts = {}) => {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: opts.year === false ? undefined : 'numeric' });
};

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

export const formatDateTime = (value) => (value ? `${formatDate(value)}, ${formatTime(value)}` : '—');

export const timeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(iso);
};

export const formatMoney = (amount, currency = 'INR', { compact = false } = {}) => {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      notation: compact && Math.abs(n) >= 100000 ? 'compact' : 'standard',
    }).format(n);
  } catch {
    // Not an ISO currency code (e.g. a custom label): show it as plain text
    return `${currency} ${n.toLocaleString('en-IN')}`;
  }
};

export const formatNumber = (n) => (Number(n) || 0).toLocaleString('en-IN');

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const initials = (name = '') =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

export const plural = (n, one, many = `${one}s`) => `${formatNumber(n)} ${Number(n) === 1 ? one : many}`;

/**
 * Subscription dates are stored as the end of a UTC day (e.g. 2026-11-30T23:59:59Z).
 * Show that calendar day as-is, so it does not shift to the next day in Indian time.
 */
export const formatDay = (iso) => (iso ? formatDate(String(iso).slice(0, 10)) : '—');
