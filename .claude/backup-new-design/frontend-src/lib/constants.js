/** Shared definitions so every page shows stages, priorities and activities the same way. */

export const STAGES = [
  { key: 'Lead Generation', short: 'New', tone: 'slate' },
  { key: 'Contact Established', short: 'Contacted', tone: 'info' },
  { key: 'Requirement Understood', short: 'Requirement', tone: 'violet' },
  { key: 'Sample Sent', short: 'Sample sent', tone: 'cyan' },
  { key: 'Quotation Sent', short: 'Quotation', tone: 'amber' },
  { key: 'Negotiation', short: 'Negotiation', tone: 'orange' },
  { key: 'Closed Won', short: 'Won', tone: 'green' },
  { key: 'Closed Lost', short: 'Lost', tone: 'red' },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);
export const OPEN_STAGES = STAGE_KEYS.filter((s) => s !== 'Closed Won' && s !== 'Closed Lost');
export const stageInfo = (key) => STAGES.find((s) => s.key === key) || STAGES[0];
export const isClosed = (stage) => stage === 'Closed Won' || stage === 'Closed Lost';

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const PRIORITY_TONE = { Low: 'slate', Medium: 'info', High: 'amber', Urgent: 'red' };

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

/** Customer touches an employee can log. Keys match the backend activity types. */
export const ACTIVITY_TYPES = [
  { key: 'call_initiated', label: 'Call', icon: 'Phone' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
  { key: 'email', label: 'Email', icon: 'Mail' },
  { key: 'meeting', label: 'Meeting', icon: 'Users' },
  { key: 'response', label: 'Response received', icon: 'Reply' },
  { key: 'email_reply', label: 'Email reply', icon: 'MailOpen' },
  { key: 'price_discussion', label: 'Price discussion', icon: 'BadgeIndianRupee' },
  { key: 'payment_discussion', label: 'Payment discussion', icon: 'Wallet' },
  { key: 'sample_discussion', label: 'Sample discussion', icon: 'FlaskConical' },
  { key: 'sample_sent', label: 'Sample sent', icon: 'Package' },
  { key: 'sent_quotations', label: 'Quotation sent', icon: 'FileText' },
  { key: 'negotiation', label: 'Negotiation', icon: 'Handshake' },
  { key: 'note', label: 'Note', icon: 'StickyNote' },
];

export const ACTIVITY_LABEL = Object.fromEntries(
  ACTIVITY_TYPES.map((a) => [a.key, a.label]).concat([
    ['new_lead', 'Lead created'],
    ['stage_change', 'Stage changed'],
    ['reassign', 'Reassigned'],
    ['follow_up', 'Follow-up scheduled'],
    ['lead_updated', 'Lead updated'],
    ['lead_deleted', 'Moved to trash'],
    ['lead_restored', 'Restored'],
  ])
);

export const ROLE_LABEL = { owner: 'Owner', manager: 'Manager', agent: 'Sales staff' };

/** What each toggleable permission means, in plain words (shown on the Team page). */
export const PERMISSION_INFO = [
  { key: 'leads_scope', label: 'Which leads they can see', type: 'choice', options: [{ value: 'own', label: 'Only their own' }, { value: 'all', label: 'All company leads' }] },
  { key: 'leads_create', label: 'Add new leads' },
  { key: 'leads_edit', label: 'Edit leads' },
  { key: 'leads_reassign', label: 'Assign leads to other people' },
  { key: 'leads_delete', label: 'Delete leads (moves to trash)' },
  { key: 'leads_import', label: 'Import leads from a file' },
  { key: 'leads_export', label: 'Download leads (export)', risky: true },
  { key: 'tasks_assign', label: 'Give tasks to others' },
  { key: 'analytics_scope', label: 'Reports they can see', type: 'choice', options: [{ value: 'own', label: 'Only their own numbers' }, { value: 'company', label: 'Whole company' }] },
  { key: 'team_reports', label: 'See other people’s daily activity' },
];
