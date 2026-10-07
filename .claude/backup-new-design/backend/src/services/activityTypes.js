/**
 * Every customer touch is an activity. Outreach counts, daily reports, the activity feed
 * and each lead's timeline are all derived from these records.
 */
const OUTREACH_TYPES = [
  'new_lead',
  'call_initiated',
  'email',
  'whatsapp',
  'response',
  'meeting',
  'price_discussion',
  'payment_discussion',
  'sample_discussion',
  'sample_sent',
  'negotiation',
  'sent_quotations',
  'email_reply',
];

const SYSTEM_TYPES = ['note', 'stage_change', 'reassign', 'follow_up', 'lead_updated', 'lead_deleted', 'lead_restored'];

const ACTIVITY_TYPES = [...OUTREACH_TYPES, ...SYSTEM_TYPES];

const ACTIVITY_LABELS = {
  new_lead: 'New lead',
  call_initiated: 'Call',
  email: 'Email',
  whatsapp: 'WhatsApp',
  response: 'Response received',
  meeting: 'Meeting',
  price_discussion: 'Price discussion',
  payment_discussion: 'Payment discussion',
  sample_discussion: 'Sample discussion',
  sample_sent: 'Sample sent',
  negotiation: 'Negotiation',
  sent_quotations: 'Quotation sent',
  email_reply: 'Email reply',
  note: 'Note',
  stage_change: 'Stage changed',
  reassign: 'Reassigned',
  follow_up: 'Follow-up scheduled',
  lead_updated: 'Lead updated',
  lead_deleted: 'Lead moved to trash',
  lead_restored: 'Lead restored',
};

module.exports = { OUTREACH_TYPES, SYSTEM_TYPES, ACTIVITY_TYPES, ACTIVITY_LABELS };
