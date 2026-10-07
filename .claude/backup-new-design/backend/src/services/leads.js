const { newId, nowIso } = require('../db/tenant');
const { ACTIVITY_LABELS } = require('./activityTypes');
const {
  HttpError,
  LEAD_STAGES,
  PRIORITIES,
  text,
  email,
  number,
  oneOf,
  dateOnly,
  stringList,
  compact,
  ensureSize,
} = require('../utils/validate');

const sanitizeContacts = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new HttpError(400, 'Contacts must be a list');
  if (value.length > 20) throw new HttpError(400, 'A lead can have at most 20 contacts');
  return value
    .map((c) =>
      compact({
        name: text(c?.name, { field: 'Contact name', max: 120 }),
        designation: text(c?.designation, { field: 'Designation', max: 120 }),
        phone: text(c?.phone, { field: 'Contact phone', max: 40 }),
        whatsapp: text(c?.whatsapp, { field: 'Contact WhatsApp', max: 40 }),
        email: email(c?.email, { field: 'Contact email' }),
        linkedin: text(c?.linkedin, { field: 'LinkedIn', max: 300 }),
      })
    )
    .filter((c) => Object.values(c).some(Boolean));
};

const sanitizePlainObject = (value, field) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, `${field} must be an object`);
  const out = {};
  for (const [k, v] of Object.entries(value).slice(0, 60)) {
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) {
      out[String(k).slice(0, 60)] = typeof v === 'string' ? v.slice(0, 500) : v;
    }
  }
  return out;
};

/**
 * Whitelists the editable lead fields. Ownership, timestamps and deletion state are never
 * taken from the request body.
 */
const sanitizeLeadInput = (body, { requireName = false } = {}) => {
  const products = stringList(body.products, { field: 'Products', maxItems: 50 });
  const lead = compact({
    name: text(body.name ?? body.company_name, { field: 'Company name', max: 160, required: requireName }),
    type: text(body.type, { field: 'Type', max: 40 }),
    industry_type: text(body.industry_type, { field: 'Industry', max: 120 }),
    contacts: sanitizeContacts(body.contacts),
    contact_person: text(body.contact_person, { field: 'Contact person', max: 120 }),
    email: email(body.email),
    phone: text(body.phone, { field: 'Phone', max: 40 }),
    whatsapp: text(body.whatsapp, { field: 'WhatsApp', max: 40 }),
    website: text(body.website, { field: 'Website', max: 300 }),
    address: text(body.address, { field: 'Address', max: 500 }),
    country: text(body.country, { field: 'Country', max: 80 }),
    source: text(body.source ?? body.lead_source, { field: 'Source', max: 120 }),
    credit_rating: text(body.credit_rating, { field: 'Credit rating', max: 20 }),
    turnover: text(body.turnover, { field: 'Turnover', max: 60 }),
    products,
    quantity: number(body.quantity, { field: 'Quantity' }),
    quantity_unit: text(body.quantity_unit, { field: 'Quantity unit', max: 20 }),
    price: number(body.price, { field: 'Price' }),
    value: number(body.value, { field: 'Deal value' }),
    currency: text(body.currency, { field: 'Currency', max: 10 }),
    stage: oneOf(body.stage, LEAD_STAGES, { field: 'Stage' }),
    priority: oneOf(body.priority, PRIORITIES, { field: 'Priority' }),
    incoterm: text(body.incoterm, { field: 'Incoterm', max: 20 }),
    port_delivery: text(body.port_delivery, { field: 'Port of delivery', max: 160 }),
    payment_terms: text(body.payment_terms ?? body.payment_days, { field: 'Payment terms', max: 160 }),
    export_requirements: sanitizePlainObject(body.export_requirements, 'Requirements'),
    expected_close_date: dateOnly(body.expected_close_date, { field: 'Expected close date' }),
    follow_up_date: dateOnly(body.follow_up_date, { field: 'Follow-up date' }),
    notes: text(body.notes, { field: 'Notes', max: 5000 }),
    tags: stringList(body.tags, { field: 'Tags', maxItems: 30, maxLen: 40 }),
  });
  if (lead.name === '') throw new HttpError(400, 'Company name cannot be empty');
  if (products) lead.product = products.join(', ');
  ensureSize(lead, 'Lead');
  return lead;
};

// "ACME Spices L.L.C." and "Acme Spices LLC" are the same buyer
const normalizeName = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\b([a-z])\.(?=[a-z]\.)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(pvt|private|ltd|limited|llc|inc|co|company|corp|corporation|gmbh|sdn|bhd)\b/g, '')
    .replace(/\s+/g, '');

const normalizePhone = (s) => String(s || '').replace(/\D/g, '').slice(-10);

/** Finds an existing (non-deleted) lead that looks like the same buyer. */
const findDuplicate = (candidate, existingLeads) => {
  const name = normalizeName(candidate.name);
  const mail = (candidate.email || '').toLowerCase();
  const phone = normalizePhone(candidate.phone);
  return (
    existingLeads.find(
      (l) =>
        (name && normalizeName(l.name) === name) ||
        (mail && (l.email || '').toLowerCase() === mail) ||
        (phone.length >= 7 && normalizePhone(l.phone) === phone)
    ) || null
  );
};

const buildActivity = (req, { lead, type, note = '', meta, timestamp }) => ({
  id: newId('act'),
  lead_id: lead ? lead.id : null,
  lead_name: lead ? lead.name : null,
  user_id: req.user.id,
  type,
  title: ACTIVITY_LABELS[type] || type,
  note,
  ...(meta ? { meta } : {}),
  timestamp: timestamp || nowIso(),
});

/** Adds assignee / creator display names. */
const decorateLead = (lead, usersById) => {
  const agent = usersById.get(lead.assigned_to);
  return {
    ...lead,
    company_name: lead.name,
    agent_name: agent ? agent.name : 'Unassigned',
    agent_avatar: agent ? agent.avatar_url : null,
  };
};

const usersMap = async (db) => new Map((await db.find('users', {})).map((u) => [u.id, u]));

module.exports = {
  sanitizeLeadInput,
  findDuplicate,
  buildActivity,
  decorateLead,
  usersMap,
};
