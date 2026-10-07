/** Local calendar date (YYYY-MM-DD) — not UTC, so it's correct after midnight in India. */
export const localToday = () => toLocalDate(new Date());

export const toLocalDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toLocalDate(new Date(y, m - 1, d + days));
};

/** Whole days from today to the given YYYY-MM-DD (negative = in the past). */
export const daysFromToday = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = localToday().split('-').map(Number);
  return Math.round((new Date(y, m - 1, d) - new Date(ty, tm - 1, td)) / 86400000);
};

export const formatDate = (value, opts = {}) => {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: opts.year === false ? undefined : 'numeric' });
};

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

export const formatDateTime = (value) => (value ? `${formatDate(value)}, ${formatTime(value)}` : '—');

/** "in 3 days", "today", "2 days ago" for a YYYY-MM-DD. */
export const relativeDay = (dateStr) => {
  const n = daysFromToday(dateStr);
  if (n === null) return '';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
};

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
    return `${currency} ${n.toLocaleString()}`;
  }
};

export const formatNumber = (n) => (Number(n) || 0).toLocaleString('en-IN');

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
