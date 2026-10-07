// One-off: converts the frontend's bundled sample data into backend/src/seed/demo-data.json
// (used only for the demo company). Dates are kept as-is; the backend shifts them at seed time.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { SEED_LEADS } from 'file:///C:/crm/frontend/src/data/seedLeads.js';
import { TEAM_MEMBERS, INITIAL_MY_DAYS_REPORTS } from 'file:///C:/crm/frontend/src/data/myDaysData.js';
import { INITIAL_OUTREACH_LOGS } from 'file:///C:/crm/frontend/src/data/outreachData.js';

const require = createRequire(import.meta.url);
const { dataStore } = require('C:/crm/backend/src/repositories/dataStore.js');

const STAGES = ['Lead Generation', 'Contact Established', 'Requirement Understood', 'Sample Sent', 'Quotation Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];

const memberKey = (name) => String(name || '').trim().toLowerCase();
const members = new Map();
const addMember = (name) => {
  const n = String(name || '').trim();
  if (!n || n === 'All users' || n === 'Unassigned' || n.startsWith('usr_')) return null;
  const key = memberKey(n);
  if (!members.has(key)) members.set(key, { key, name: n.charAt(0).toUpperCase() + n.slice(1) });
  return key;
};
TEAM_MEMBERS.forEach(addMember);

const toIso = (s) => {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};
const time12to24 = (t) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t || '').trim());
  if (!m) return '12:00';
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
};
// Demo data is Indian business hours; store as IST converted to UTC
const istToIso = (dateIso, time) => new Date(`${dateIso}T${time12to24(time)}:00+05:30`).toISOString();

const typeFromAction = (action) => {
  const a = String(action || '').toLowerCase();
  if (a.includes('price')) return 'price_discussion';
  if (a.includes('payment')) return 'payment_discussion';
  if (a.includes('sample') && a.includes('sent')) return 'sample_sent';
  if (a.includes('sample')) return 'sample_discussion';
  if (a.includes('quotation')) return 'sent_quotations';
  if (a.includes('negotiat')) return 'negotiation';
  if (a.includes('meeting')) return 'meeting';
  if (a.includes('whatsapp') || a.includes('zalo')) return 'whatsapp';
  if (a.includes('reply')) return 'email_reply';
  if (a.includes('mail')) return 'email';
  if (a.includes('response')) return 'response';
  if (a.includes('new lead')) return 'new_lead';
  return 'call_initiated';
};

const KEEP = [
  'name', 'type', 'industry_type', 'contacts', 'contact_person', 'email', 'phone', 'whatsapp', 'website', 'address',
  'country', 'source', 'credit_rating', 'turnover', 'products', 'quantity', 'price', 'value', 'stage', 'priority',
  'incoterm', 'port_delivery', 'export_requirements', 'follow_up_date', 'notes',
];

const leads = [];
const activities = [];
const leadIdByName = new Map();

for (const raw of SEED_LEADS) {
  const lead = {};
  for (const k of KEEP) if (raw[k] !== undefined && raw[k] !== '' && raw[k] !== '—') lead[k] = raw[k];
  lead.id = raw.id;
  lead.name = raw.name || raw.company_name;
  if (lead.contact_person === '—') delete lead.contact_person;
  if (!STAGES.includes(lead.stage)) lead.stage = STAGES.includes(raw.status) ? raw.status : 'Lead Generation';
  if (!['Low', 'Medium', 'High', 'Urgent'].includes(lead.priority)) lead.priority = 'Medium';
  if (!Array.isArray(lead.products)) lead.products = raw.product ? [raw.product] : [];
  lead.product = lead.products.join(', ');
  if (raw.legacy_industry_type && !lead.industry_type) lead.industry_type = raw.legacy_industry_type;
  if (raw.payment_days) lead.payment_terms = raw.payment_days;
  lead.currency = 'USD';
  lead.assignee_key = addMember(raw.assigned_to || raw.agent_name) || 'rohan';
  lead.creator_key = addMember(raw.created_by_name) || lead.assignee_key;
  lead.created_at = toIso(raw.created_at) || '2026-06-01T06:00:00.000Z';
  lead.updated_at = lead.created_at;
  if (lead.stage === 'Closed Won' || lead.stage === 'Closed Lost') lead.closed_at = lead.created_at;
  leads.push(lead);
  leadIdByName.set(String(lead.name).toLowerCase(), lead.id);

  for (const r of raw.previous_remarks || []) {
    const ts = toIso(r.timestamp);
    if (!ts || !r.text) continue;
    activities.push({ lead_id: lead.id, lead_name: lead.name, user_key: lead.assignee_key, type: 'note', note: r.text, timestamp: ts });
  }
}

const leadFor = (name) => leadIdByName.get(String(name || '').toLowerCase()) || null;

for (const report of INITIAL_MY_DAYS_REPORTS) {
  const userKey = addMember(report.user);
  for (const t of report.tasks || []) {
    activities.push({
      lead_id: leadFor(t.lead_name),
      lead_name: t.lead_name,
      user_key: userKey,
      type: typeFromAction(t.action),
      note: t.note || t.action || '',
      timestamp: istToIso(report.date_iso, t.time),
    });
  }
}

for (const log of INITIAL_OUTREACH_LOGS) {
  const userKey = addMember(log.user);
  for (const [type, entries] of Object.entries(log.activities || {})) {
    for (const e of entries || []) {
      activities.push({
        lead_id: leadFor(e.company_name),
        lead_name: e.company_name,
        user_key: userKey,
        type,
        note: e.note || '',
        timestamp: istToIso(log.date_iso, e.time),
      });
    }
  }
}

// De-duplicate activities that appear in both My Days and Outreach
const seen = new Set();
const uniqueActivities = activities.filter((a) => {
  const k = `${a.user_key}|${a.lead_name}|${a.timestamp}|${a.note}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const tasks = dataStore.tasks.map((t, i) => ({
  title: t.title,
  description: t.description,
  priority: t.priority,
  status: t.status,
  due_offset_days: i + 1,
  due_time: '18:00',
  user_key: [...members.keys()][i % members.size],
}));
// A few tasks linked to demo leads
for (const [i, l] of leads.filter((l) => l.stage === 'Contact Established').slice(0, 6).entries()) {
  tasks.push({
    title: `Share price offer with ${l.name}`,
    description: `Send updated ${l.product || 'product'} pricing and payment terms.`,
    priority: i % 2 ? 'Medium' : 'High',
    status: 'Pending',
    due_offset_days: i - 2,
    due_time: '17:00',
    user_key: l.assignee_key,
    lead_id: l.id,
  });
}

const out = { members: [...members.values()], leads, activities: uniqueActivities, tasks };
fs.mkdirSync('C:/crm/backend/src/seed', { recursive: true });
fs.writeFileSync('C:/crm/backend/src/seed/demo-data.json', JSON.stringify(out));
console.log('members', out.members.length, out.members.map((m) => m.name).join(', '));
console.log('leads', leads.length, 'activities', uniqueActivities.length, 'tasks', tasks.length);
const dates = uniqueActivities.map((a) => a.timestamp).sort();
console.log('activity range', dates[0], dates[dates.length - 1]);
console.log('linked activities', uniqueActivities.filter((a) => a.lead_id).length);
