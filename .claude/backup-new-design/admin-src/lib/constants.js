/** Badge colour classes (semantic tokens, so they follow dark mode). */
export const TONE_CLASSES = {
  slate: 'bg-subtle text-muted ring-line',
  info: 'bg-info-soft text-info-ink ring-info/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:ring-cyan-900',
  amber: 'bg-warning-soft text-warning-ink ring-warning/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-900',
  green: 'bg-primary-soft text-primary-ink ring-primary/20',
  red: 'bg-danger-soft text-danger-ink ring-danger/20',
};

export const ROLE_LABEL = { owner: 'Owner', manager: 'Manager', agent: 'Sales staff' };

/** Subscription states returned by the backend billing summary. */
export const SUBSCRIPTION_STATUS = {
  free: { label: 'Free plan', tone: 'slate' },
  active: { label: 'Active', tone: 'green' },
  expiring: { label: 'Expiring soon', tone: 'amber' },
  expired: { label: 'Expired', tone: 'red' },
};

/** Filter chips on the Companies page. Values match GET /platform/companies?status= */
export const COMPANY_FILTERS = [
  { value: '', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'suspended', label: 'Suspended' },
];

export const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Information', tone: 'info' },
  { value: 'billing', label: 'Billing', tone: 'amber' },
  { value: 'warning', label: 'Warning', tone: 'red' },
  { value: 'success', label: 'Good news', tone: 'green' },
];

export const NOTIFICATION_TYPE = Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t.value, t]));

export const AUDIENCES = [
  { value: 'owners', label: 'Owners only' },
  { value: 'everyone', label: 'Everyone in the company' },
];

export const AUDIENCE_LABEL = { owners: 'Owners', everyone: 'Everyone' };

export const PAYMENT_MONTHS = [1, 3, 6, 12];
