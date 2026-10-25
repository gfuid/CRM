/**
 * "When did we last talk to this buyer?"
 *
 * A contact is any real interaction recorded on the lead: a remark / planned action, an activity
 * (call, email, meeting, note) or a follow-up marked Completed. Creating the lead counts as the first contact.
 * A lead with no contact for STALE_DAYS days (and not Won/Lost) is flagged so no buyer is forgotten.
 */
const { dataStore } = require('../repositories/dataStore');
const { todayISO, businessDayOf } = require('./access');

const STALE_DAYS = Number(process.env.NO_CONTACT_ALERT_DAYS) || 7;
const FINAL = ['closed won', 'closed lost', 'won', 'lost', 'closed'];
const DAY = 86400000;

const ts = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
};

/** One pass over activities and follow-ups: lead id -> latest contact time (ms). */
const buildContactIndex = () => {
  const idx = new Map();
  const bump = (leadId, t) => {
    if (!leadId || !t) return;
    if (!idx.has(leadId) || idx.get(leadId) < t) idx.set(leadId, t);
  };
  // Only real interactions count: not the automatic "lead created" / "stage changed" entries
  (dataStore.activities || []).forEach((a) => {
    if (a.system || a.type === 'status_change' || a.title === 'Export Lead Created') return;
    bump(a.lead_id, ts(a.timestamp || a.created_at));
  });
  (dataStore.followUps || []).forEach((f) => {
    if (f.status === 'Completed') bump(f.lead_id, ts(f.completed_at || f.updated_at));
  });
  return idx;
};

/** Days between two business-local calendar dates. */
const daysBetween = (fromDay, toDay) => Math.round((new Date(toDay).getTime() - new Date(fromDay).getTime()) / DAY);

const contactInfo = (lead, index) => {
  let last = ts(lead.created_at);
  let how = 'Lead created';
  (Array.isArray(lead.previous_remarks) ? lead.previous_remarks : []).forEach((r) => {
    const t = ts(r && r.date);
    if (t > last && (r.today_remark || r.planned_action || r.remark)) { last = t; how = r.author ? `Remark by ${r.author}` : 'Remark'; }
  });
  const fromIndex = index ? index.get(lead.id) || 0 : 0;
  if (fromIndex > last) { last = fromIndex; how = 'Activity / follow-up'; }
  if (!last) return { last_contact_at: null, days_since_contact: null, no_contact_alert: false, last_contact_type: null };
  const days = Math.max(0, daysBetween(businessDayOf(last), todayISO()));
  const closed = FINAL.includes(String(lead.stage || lead.status || '').trim().toLowerCase());
  return {
    last_contact_at: new Date(last).toISOString(),
    last_contact_type: how,
    days_since_contact: days,
    no_contact_alert: !closed && days >= STALE_DAYS,
  };
};

module.exports = { STALE_DAYS, buildContactIndex, contactInfo };
