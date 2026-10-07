/** Helpers shared by the Leads page, board, table, drawer, form and import. No business data lives here. */
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRightLeft,
  BadgeIndianRupee,
  CalendarClock,
  FileText,
  FlaskConical,
  Handshake,
  Mail,
  MailOpen,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Plus,
  Reply,
  RotateCcw,
  StickyNote,
  Trash2,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { ACTIVITY_TYPES, isClosed } from '../../lib/constants';
import { formatMoney, localToday } from '../../lib/format';
import { loadMembers } from '../../lib/hooks';
import { useToast } from '../../context/ToastContext';

export const PAGE_SIZE = 50;
export const BOARD_COLUMN_LIMIT = 100;

/** lucide components for the icon names used in ACTIVITY_TYPES (explicit map keeps the bundle small). */
const ICONS = {
  Phone,
  MessageCircle,
  Mail,
  Users,
  Reply,
  MailOpen,
  BadgeIndianRupee,
  Wallet,
  FlaskConical,
  Package,
  FileText,
  Handshake,
  StickyNote,
};

const SYSTEM_ICONS = {
  new_lead: Plus,
  stage_change: ArrowRightLeft,
  reassign: UserRound,
  follow_up: CalendarClock,
  lead_updated: Pencil,
  lead_deleted: Trash2,
  lead_restored: RotateCcw,
};

export const SYSTEM_ACTIVITY_TYPES = new Set(Object.keys(SYSTEM_ICONS));

export const iconByName = (name) => ICONS[name] || Activity;

export const activityIcon = (type) => {
  const t = ACTIVITY_TYPES.find((a) => a.key === type);
  if (t) return iconByName(t.icon);
  return SYSTEM_ICONS[type] || Activity;
};

export const QUANTITY_UNITS = ['kg', 'MT', 'units'];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'QAR', 'KWD', 'OMR', 'CNY', 'JPY', 'SGD', 'MYR', 'AUD', 'CAD', 'BDT', 'LKR', 'NPR'];

export const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman',
  'Bahrain', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Lebanon', 'Turkey', 'Egypt', 'Morocco', 'Algeria', 'Tunisia',
  'Nigeria', 'Kenya', 'South Africa', 'Ethiopia', 'Ghana', 'Tanzania', 'Bangladesh', 'Sri Lanka', 'Nepal',
  'Pakistan', 'Afghanistan', 'Maldives', 'China', 'Japan', 'South Korea', 'Taiwan', 'Hong Kong', 'Singapore',
  'Malaysia', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'Myanmar', 'Australia', 'New Zealand', 'Canada',
  'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Germany', 'France', 'Italy', 'Spain',
  'Netherlands', 'Belgium', 'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Poland', 'Russia', 'Ukraine', 'Greece',
  'Portugal', 'Ireland',
];

/** Quick picks for follow-up dates (days from today). */
export const QUICK_DATES = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
];

export const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

export const telLink = (num) => {
  const cleaned = String(num || '').replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : null;
};

export const waLink = (num) => {
  const d = digitsOnly(num);
  return d ? `https://wa.me/${d}` : null;
};

export const whatsappNumber = (lead) => lead?.whatsapp || lead?.phone || '';

/** 'closed' | 'none' | 'overdue' | 'today' | 'upcoming' */
export const followUpBucket = (lead, today = localToday()) => {
  if (isClosed(lead.stage)) return 'closed';
  const d = (lead.follow_up_date || '').slice(0, 10);
  if (!d) return 'none';
  if (d < today) return 'overdue';
  if (d === today) return 'today';
  return 'upcoming';
};

export const matchesSearch = (lead, needle) =>
  [lead.name, lead.contact_person, lead.email, lead.phone, lead.whatsapp, lead.country, ...(lead.products || [])].some(
    (v) => v && String(v).toLowerCase().includes(needle)
  );

/** Sort without mutating. Empty values always go last. */
export const sortLeads = (list, { key, dir }) => {
  const sign = dir === 'asc' ? 1 : -1;
  const get = {
    name: (l) => (l.name || '').toLowerCase(),
    value: (l) => (l.value === undefined || l.value === null || l.value === '' ? null : Number(l.value)),
    follow_up: (l) => (l.follow_up_date || '').slice(0, 10) || null,
    created_at: (l) => l.created_at || null,
  }[key];
  return [...list].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    if (typeof x === 'string') return x.localeCompare(y) * sign;
    return (x - y) * sign;
  });
};

/** "₹1,20,000 + $5,000" — values in different currencies are never added together. */
export const sumByCurrency = (leads, fallbackCurrency = 'INR') => {
  const totals = new Map();
  for (const l of leads) {
    const v = Number(l.value);
    if (!v) continue;
    const c = l.currency || fallbackCurrency;
    totals.set(c, (totals.get(c) || 0) + v);
  }
  if (!totals.size) return '';
  return [...totals.entries()]
    .sort((a, b) => (a[0] === fallbackCurrency ? -1 : b[0] === fallbackCurrency ? 1 : b[1] - a[1]))
    .map(([c, v]) => formatMoney(v, c, { compact: true }))
    .join(' + ');
};

export const hasValue = (v) => v !== undefined && v !== null && v !== '';

export const moneyOrDash = (lead, fallbackCurrency) =>
  hasValue(lead.value) ? formatMoney(lead.value, lead.currency || fallbackCurrency) : '—';

/** The list keeps leads light: drop the drawer-only timeline and tasks. */
export const listLead = (lead) => {
  if (!lead) return lead;
  const { activities: _a, tasks: _t, ...rest } = lead;
  return rest;
};

/** Team members for assignee pickers and filters. Errors are shown, not hidden. */
export function useTeamMembers() {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  useEffect(() => {
    let alive = true;
    loadMembers()
      .then((m) => alive && setMembers(Array.isArray(m) ? m : []))
      .catch((e) => alive && toast.error(`Couldn’t load team members. ${e.message}`));
    return () => {
      alive = false;
    };
  }, [toast]);
  return members;
}
