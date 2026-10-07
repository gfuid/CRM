import { addDays, formatDate, localToday } from '../../lib/format';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const PRESETS = [
  { key: '7d', label: 'Last 7 days', range: (today) => ({ from: addDays(today, -6), to: today }) },
  { key: '30d', label: 'Last 30 days', range: (today) => ({ from: addDays(today, -29), to: today }) },
  { key: '90d', label: 'Last 90 days', range: (today) => ({ from: addDays(today, -89), to: today }) },
  { key: 'month', label: 'This month', range: (today) => ({ from: `${today.slice(0, 7)}-01`, to: today }) },
];

export const DEFAULT_PRESET = '30d';

const isDate = (v) => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Reads the report period from the URL (?from&to, plus ?period to remember which preset
 * or "custom" was picked). Falls back to the last 30 days.
 */
export function readRange(query) {
  const today = localToday();
  let from = query.get('from');
  let to = query.get('to');
  if (!isDate(from) || !isDate(to) || from > to) {
    ({ from, to } = PRESETS.find((p) => p.key === DEFAULT_PRESET).range(today));
    return { from, to, period: DEFAULT_PRESET };
  }
  const asked = query.get('period');
  if (asked === 'custom') return { from, to, period: 'custom' };
  const askedPreset = PRESETS.find((p) => p.key === asked);
  const matchesAsked = askedPreset && sameRange(askedPreset.range(today), { from, to });
  const detected = matchesAsked ? askedPreset : PRESETS.find((p) => sameRange(p.range(today), { from, to }));
  return { from, to, period: detected ? detected.key : 'custom' };
}

const sameRange = (a, b) => a.from === b.from && a.to === b.to;

export const formatRange = ({ from, to }) => (from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`);

/** Number of calendar days in an inclusive range. */
export const rangeDays = ({ from, to }) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
