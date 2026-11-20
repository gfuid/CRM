/**
 * Quotations and Proforma Invoices (every company; staff need the owner's "Quotations" permission).
 *
 * Records live in dataStore.waRecords:
 *   doc_profile  the company's letterhead: address, GSTIN / IEC, logo, bank details, default terms, numbering
 *   sales_doc    one quotation or proforma invoice (buyer, terms, items, charges, totals, status, share token)
 * The PDF is made on request (salesDocPdf.service). A share link (/api/v1/documents/share/<token>) lets the
 * buyer open the PDF from WhatsApp or email without logging in.
 */
const crypto = require('crypto');
const ApiResponse = require('../utils/apiResponse');
const config = require('../config/env');
const { dataStore, dbSync } = require('../repositories/dataStore');
const { isSuperAdmin, isOwnerUser } = require('../utils/access');
const { isLeadInUserScope } = require('../utils/tenantScope');
const { ownerOf } = require('../utils/usage');
const pdf = require('../services/salesDocPdf.service');

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : (typeof v === 'number' ? String(v).slice(0, max) : ''));
const num = (v, max = 1e12) => { const n = Number(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? Math.min(Math.max(n, -max), max) : 0; };
const round2 = (n) => Math.round(n * 100) / 100;
const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const newId = (p) => `${p}_${crypto.randomBytes(12).toString('hex')}`;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = { quotation: 'Quotation', proforma: 'Proforma Invoice' };
const STATUSES = ['draft', 'sent', 'accepted', 'rejected'];
const MAX_LOGO = 500 * 1024;

const DEFAULT_TERMS = {
  quotation: '1. Prices are valid until the date shown above.\n2. Quantity tolerance ±5%.\n3. Quality as per agreed specification; third-party inspection at buyer\'s cost if required.\n4. Any duties and taxes at the destination are for the buyer\'s account.',
  proforma: '1. Shipment after receipt of payment / LC as per the payment terms.\n2. Quantity tolerance ±5%.\n3. Please quote the invoice number with the payment.\n4. Bank charges outside India are for the buyer\'s account.',
};

/* ------------------------------------------------------------------ */
/* Records + access                                                    */
/* ------------------------------------------------------------------ */

const all = () => dataStore.waRecords || (dataStore.waRecords = []);
const save = (rec) => {
  const list = all();
  const i = list.findIndex((r) => r.id === rec.id);
  if (i >= 0) list[i] = rec; else list.push(rec);
  dbSync.saveWaRecord(rec);
  return rec;
};
const remove = (id) => {
  const list = all();
  const i = list.findIndex((r) => r.id === id);
  if (i >= 0) list.splice(i, 1);
  dbSync.deleteWaRecord(id);
};

const requireAccess = (req, res, next) => {
  if (isSuperAdmin(req.user)) return res.status(403).json({ success: false, message: 'Quotations are made by company accounts.' });
  const isOwner = isOwnerUser(req.user);
  const owner = isOwner ? (dataStore.users.find((u) => u.id === req.user.id) || req.user) : ownerOf(req.user);
  if (!owner) return res.status(403).json({ success: false, message: 'Company not found' });
  if (!isOwner) {
    const fresh = dataStore.users.find((u) => u.id === req.user.id) || req.user;
    if (!(fresh.permissions && fresh.permissions.quotations === true)) return res.status(403).json({ success: false, code: 'NO_PERMISSION', message: 'Your company owner has not given you access to Quotations.' });
  }
  req.docs = { owner: owner.id, isOwner, ownerUser: owner };
  return next();
};
const ownerOnly = (req, res, next) => (req.docs && req.docs.isOwner ? next() : res.status(403).json({ success: false, code: 'OWNER_ONLY', message: 'Only the company owner can change the company details.' }));

/* ------------------------------------------------------------------ */
/* Company profile (letterhead, bank, defaults)                        */
/* ------------------------------------------------------------------ */

const profileOf = (owner) => all().find((r) => r.kind === 'doc_profile' && r.owner_id === owner) || null;
const profileWithDefaults = (ownerUser) => {
  const p = profileOf(ownerUser.id) || {};
  return {
    company_name: p.company_name || ownerUser.company_name || '',
    address: p.address || '', phone: p.phone || ownerUser.phone || '', email: p.email || ownerUser.email || '', website: p.website || '',
    gstin: p.gstin || '', iec: p.iec || '', other_id: p.other_id || '',
    signatory: p.signatory || ownerUser.name || '', signatory_title: p.signatory_title || '',
    bank: p.bank || {}, logo: p.logo || null,
    prefix_quotation: p.prefix_quotation || 'QT', prefix_proforma: p.prefix_proforma || 'PI',
    terms_quotation: p.terms_quotation !== undefined ? p.terms_quotation : DEFAULT_TERMS.quotation,
    terms_proforma: p.terms_proforma !== undefined ? p.terms_proforma : DEFAULT_TERMS.proforma,
    default_currency: p.default_currency || 'USD', valid_days: p.valid_days || 15,
    port_loading: p.port_loading || '', origin: p.origin || 'India',
    counters: p.counters || {},
  };
};
const profileView = (p) => ({ ...p, logo: p.logo ? { mime: p.logo.mime, url: `data:${p.logo.mime};base64,${p.logo.data}` } : null, counters: undefined });

const getProfile = async (req, res) => ApiResponse.success(res, profileView(profileWithDefaults(req.docs.ownerUser)));

const saveProfile = async (req, res) => {
  const owner = req.docs.owner;
  const b = req.body || {};
  const prev = profileOf(owner) || { id: newId('dpr'), kind: 'doc_profile', owner_id: owner, created_at: nowIso() };
  const bank = b.bank && typeof b.bank === 'object' ? b.bank : (prev.bank || {});
  const next = {
    ...prev,
    company_name: str(b.company_name, 150), address: str(b.address, 400), phone: str(b.phone, 60), email: str(b.email, 120), website: str(b.website, 120),
    gstin: str(b.gstin, 30), iec: str(b.iec, 30), other_id: str(b.other_id, 80),
    signatory: str(b.signatory, 80), signatory_title: str(b.signatory_title, 80),
    bank: Object.fromEntries(['account_name', 'bank_name', 'branch', 'account_no', 'swift', 'ifsc', 'ad_code', 'intermediary'].map((k) => [k, str(bank[k], k === 'intermediary' ? 300 : 120)])),
    prefix_quotation: str(b.prefix_quotation, 10).replace(/[^A-Za-z0-9/-]/g, '') || 'QT',
    prefix_proforma: str(b.prefix_proforma, 10).replace(/[^A-Za-z0-9/-]/g, '') || 'PI',
    terms_quotation: typeof b.terms_quotation === 'string' ? b.terms_quotation.slice(0, 3000) : prev.terms_quotation,
    terms_proforma: typeof b.terms_proforma === 'string' ? b.terms_proforma.slice(0, 3000) : prev.terms_proforma,
    default_currency: (str(b.default_currency, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'USD'),
    valid_days: Math.min(365, Math.max(1, Math.round(num(b.valid_days)) || 15)),
    port_loading: str(b.port_loading, 100), origin: str(b.origin, 60),
    updated_at: nowIso(),
  };
  if (b.remove_logo) next.logo = null;
  if (b.logo_data_url) {
    const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.logo_data_url));
    if (!m) return ApiResponse.error(res, 'The logo must be a JPG or PNG picture', 400);
    const buf = Buffer.from(m[2], 'base64');
    if (!((buf[0] === 0xff && buf[1] === 0xd8) || (buf[0] === 0x89 && buf[1] === 0x50))) return ApiResponse.error(res, 'The logo is not a real JPG or PNG picture', 400);
    if (buf.length > MAX_LOGO) return ApiResponse.error(res, 'The logo is larger than 500 KB. Please use a smaller one.', 413);
    next.logo = { mime: m[1], data: m[2] };
  }
  save(next);
  return ApiResponse.success(res, profileView(profileWithDefaults(req.docs.ownerUser)), 'Company details saved');
};

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

const docsOf = (owner) => all().filter((r) => r.kind === 'sales_doc' && r.owner_id === owner);
const canSee = (req, d) => req.docs.isOwner || d.created_by === req.user.id || (d.lead_id && (() => { const l = dataStore.leads.find((x) => x.id === d.lead_id); return l && isLeadInUserScope(l, req.user); })());
const shareUrl = (d) => (d.share_token ? `${config.apiPublicUrl}/api/v1/documents/share/${d.share_token}` : '');
const view = (d) => ({ ...d, share_url: shareUrl(d) });
const brief = (d) => ({ id: d.id, type: d.type, number: d.number, date: d.date, valid_until: d.valid_until, status: d.status, currency: d.currency, incoterm: d.incoterm, total: d.totals.total, buyer: d.buyer.company, country: d.buyer.country, lead_id: d.lead_id || null, created_by_name: d.created_by_name, sent_at: d.sent_at || null, share_url: shareUrl(d), items: d.items.length });

const nextNumber = (req, type) => {
  const owner = req.docs.owner;
  const prof = profileOf(owner) || save({ id: newId('dpr'), kind: 'doc_profile', owner_id: owner, created_at: nowIso() });
  const year = new Date().getFullYear();
  const counters = prof.counters || {};
  const c = counters[type] && counters[type].year === year ? counters[type] : { year, n: 0 };
  // Never reuse a number that already exists (e.g. after a restore)
  const prefix = (type === 'proforma' ? prof.prefix_proforma : prof.prefix_quotation) || (type === 'proforma' ? 'PI' : 'QT');
  let n = c.n + 1;
  const used = new Set(docsOf(owner).map((d) => d.number));
  while (used.has(`${prefix}-${year}-${String(n).padStart(4, '0')}`)) n += 1;
  prof.counters = { ...counters, [type]: { year, n } };
  save(prof);
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
};

/** Reads and checks the editable part of a document. Throws a readable Error. */
const readDoc = (b) => {
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map((it) => {
    const qty = Math.max(0, num(it.qty, 1e9));
    const rate = Math.max(0, num(it.rate, 1e9));
    return { description: str(it.description, 300), specs: str(it.specs, 600), hs_code: str(it.hs_code, 20), qty, unit: str(it.unit, 15) || 'MT', rate, amount: round2(qty * rate) };
  }).filter((it) => it.description || it.qty || it.rate);
  if (!items.length) throw new Error('Add at least one product line');
  if (items.some((it) => !it.description)) throw new Error('Every product line needs a description');
  const charges = (Array.isArray(b.charges) ? b.charges : []).slice(0, 10).map((c) => ({ label: str(c.label, 60), amount: round2(num(c.amount, 1e9)) })).filter((c) => c.label && c.amount);
  const subtotal = round2(items.reduce((s, it) => s + it.amount, 0));
  const total = round2(subtotal + charges.reduce((s, c) => s + c.amount, 0));
  if (total < 0) throw new Error('The total cannot be below zero');
  const currency = str(b.currency, 3).toUpperCase().replace(/[^A-Z]/g, '');
  if (currency.length !== 3) throw new Error('Choose the currency');
  const buyer = b.buyer || {};
  if (!str(buyer.company, 150)) throw new Error('Write the buyer\'s company name');
  const date = DATE.test(String(b.date)) ? b.date : today();
  const valid = b.valid_until && DATE.test(String(b.valid_until)) ? b.valid_until : '';
  if (valid && valid < date) throw new Error('"Valid until" is before the date');
  return {
    date, valid_until: valid, currency, buyer_ref: str(b.buyer_ref, 60),
    buyer: { company: str(buyer.company, 150), contact: str(buyer.contact, 100), address: str(buyer.address, 300), city: str(buyer.city, 80), country: str(buyer.country, 80), email: str(buyer.email, 120), phone: str(buyer.phone, 40) },
    incoterm: str(b.incoterm, 20), port_loading: str(b.port_loading, 100), port_discharge: str(b.port_discharge, 100),
    payment_terms: str(b.payment_terms, 200), delivery: str(b.delivery, 150), packing: str(b.packing, 200), origin: str(b.origin, 60),
    items, charges, totals: { subtotal, total },
    notes: str(b.notes, 1500), terms: typeof b.terms === 'string' ? b.terms.slice(0, 3000) : '',
  };
};

const leadFor = (req, leadId) => {
  if (!leadId) return null;
  const l = dataStore.leads.find((x) => x.id === leadId);
  return l && isLeadInUserScope(l, req.user) ? l : null;
};

/** A new document filled from a lead (and the company's defaults). */
const prefill = async (req, res) => {
  const type = TYPES[req.query.type] ? req.query.type : 'quotation';
  const p = profileWithDefaults(req.docs.ownerUser);
  const lead = leadFor(req, req.query.lead_id);
  if (req.query.lead_id && !lead) return ApiResponse.error(res, 'Lead not found', 404);
  const er = (lead && lead.export_requirements) || {};
  const contact = lead && Array.isArray(lead.contacts) && lead.contacts[0] ? lead.contacts[0] : {};
  const products = lead ? (Array.isArray(lead.products) && lead.products.length ? lead.products : String(lead.product || '').split(',').map((x) => x.trim()).filter(Boolean)) : [];
  const unit = (lead && (lead.quantity_unit || er.quantity_unit)) || 'MT';
  const qty = lead ? Number(lead.quantity) || 0 : 0;
  const leadRate = lead && Number(lead.price) > 0 && qty > 0 && Number(lead.price) > qty * 5 ? round2(Number(lead.price) / qty) : 0;
  const doc = {
    type, date: today(), valid_until: addDays(today(), p.valid_days), currency: p.default_currency,
    buyer: lead ? { company: lead.company_name || lead.name || '', contact: contact.name || lead.contact_person || '', address: lead.address || '', city: lead.city || '', country: lead.country || '', email: contact.email || lead.email || '', phone: contact.phone || lead.phone || '' } : { company: '', contact: '', address: '', city: '', country: '', email: '', phone: '' },
    incoterm: er.incoterm || 'FOB', port_loading: p.port_loading, port_discharge: er.port_delivery || '',
    payment_terms: er.payment_days || '', delivery: '', packing: '', origin: p.origin,
    items: (products.length ? products : ['']).map((name, i) => ({ description: name, specs: i === 0 ? (er.product_notes || '') : '', hs_code: '', qty: i === 0 ? qty : 0, unit, rate: i === 0 ? leadRate : 0 })),
    charges: [], notes: '', terms: type === 'proforma' ? p.terms_proforma : p.terms_quotation,
    lead_id: lead ? lead.id : null,
  };
  return ApiResponse.success(res, doc);
};

const listDocs = async (req, res) => {
  const type = TYPES[req.query.type] ? req.query.type : null;
  const list = docsOf(req.docs.owner)
    .filter((d) => (!type || d.type === type) && (!req.query.lead_id || d.lead_id === req.query.lead_id) && canSee(req, d))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return ApiResponse.success(res, list.map(brief));
};

const findDoc = (req) => docsOf(req.docs.owner).find((d) => d.id === req.params.id && canSee(req, d));

const getDoc = async (req, res) => {
  const d = findDoc(req);
  return d ? ApiResponse.success(res, view(d)) : ApiResponse.error(res, 'Document not found', 404);
};

const createDoc = async (req, res) => {
  const b = req.body || {};
  const type = TYPES[b.type] ? b.type : 'quotation';
  const lead = b.lead_id ? leadFor(req, b.lead_id) : null;
  if (b.lead_id && !lead) return ApiResponse.error(res, 'Lead not found', 404);
  let fields;
  try { fields = readDoc(b); } catch (err) { return ApiResponse.error(res, err.message, 400); }
  const d = save({
    id: newId('sdc'), kind: 'sales_doc', owner_id: req.docs.owner, type, number: nextNumber(req, type), status: 'draft', ...fields,
    lead_id: lead ? lead.id : null, from_doc_id: str(b.from_doc_id, 40) || null,
    share_token: crypto.randomBytes(18).toString('base64url'),
    created_by: req.user.id, created_by_name: req.user.name || '', created_at: nowIso(), updated_at: nowIso(),
  });
  return ApiResponse.success(res, view(d), `${TYPES[type]} ${d.number} saved`, 201);
};

const updateDoc = async (req, res) => {
  const d = findDoc(req);
  if (!d) return ApiResponse.error(res, 'Document not found', 404);
  if (!req.docs.isOwner && d.created_by !== req.user.id) return ApiResponse.error(res, 'You can change only documents you made', 403);
  const b = req.body || {};
  if (b.status !== undefined && Object.keys(b).length === 1) {
    if (!STATUSES.includes(b.status)) return ApiResponse.error(res, 'Unknown status', 400);
    d.status = b.status;
    d.updated_at = nowIso();
    save(d);
    return ApiResponse.success(res, view(d), `Marked ${b.status}`);
  }
  let fields;
  try { fields = readDoc(b); } catch (err) { return ApiResponse.error(res, err.message, 400); }
  Object.assign(d, fields, { updated_at: nowIso(), edited_by_name: req.user.name || '' });
  save(d);
  return ApiResponse.success(res, view(d), 'Saved');
};

const deleteDoc = async (req, res) => {
  const d = findDoc(req);
  if (!d) return ApiResponse.error(res, 'Document not found', 404);
  if (!req.docs.isOwner && d.created_by !== req.user.id) return ApiResponse.error(res, 'You can delete only documents you made', 403);
  remove(d.id);
  return ApiResponse.success(res, { id: d.id }, `${d.number} deleted (its share link stops working)`);
};

/** Quotation -> a new Proforma Invoice with the same buyer, terms and lines. */
const convertDoc = async (req, res) => {
  const q = findDoc(req);
  if (!q) return ApiResponse.error(res, 'Document not found', 404);
  if (q.type !== 'quotation') return ApiResponse.error(res, 'Only a quotation can be turned into a proforma invoice', 400);
  const p = profileWithDefaults(req.docs.ownerUser);
  const pi = save({
    ...q, id: newId('sdc'), type: 'proforma', number: nextNumber(req, 'proforma'), status: 'draft', date: today(), valid_until: addDays(today(), p.valid_days),
    terms: p.terms_proforma, from_doc_id: q.id, share_token: crypto.randomBytes(18).toString('base64url'), sent_at: null,
    created_by: req.user.id, created_by_name: req.user.name || '', created_at: nowIso(), updated_at: nowIso(),
  });
  if (q.status === 'draft' || q.status === 'sent') { q.status = 'accepted'; q.updated_at = nowIso(); save(q); }
  return ApiResponse.success(res, view(pi), `Proforma Invoice ${pi.number} made from ${q.number}`, 201);
};

/** "Sent" by WhatsApp / email / download: status + a remark on the lead. */
const markSent = async (req, res) => {
  const d = findDoc(req);
  if (!d) return ApiResponse.error(res, 'Document not found', 404);
  const channel = ['whatsapp', 'email', 'download', 'link'].includes(req.body && req.body.channel) ? req.body.channel : 'link';
  const first = !d.sent_at;
  d.status = d.status === 'draft' ? 'sent' : d.status;
  d.sent_at = d.sent_at || nowIso();
  d.updated_at = nowIso();
  save(d);
  const lead = d.lead_id ? dataStore.leads.find((l) => l.id === d.lead_id) : null;
  if (lead && first) {
    const amount = `${d.currency} ${d.totals.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}${d.incoterm ? ` ${d.incoterm}` : ''}`;
    const text = `${TYPES[d.type]} ${d.number} sent${channel === 'download' ? '' : ` by ${channel === 'link' ? 'link' : channel === 'whatsapp' ? 'WhatsApp' : 'email'}`}: ${amount} (${d.items.map((it) => it.description).join(', ').slice(0, 120)})`;
    const action = d.type === 'quotation' ? 'Follow up on the quotation' : 'Follow up on payment / LC';
    const followUp = addDays(today(), 3);
    lead.previous_remarks = [{ today_remark: text, planned_action: action, remark: `Interaction: ${text} | Planned for ${followUp}: ${action}`, follow_up_date: followUp, date: nowIso(), author: req.user.name || 'User', author_id: req.user.id, doc_id: d.id }, ...(lead.previous_remarks || [])];
    lead.today_remarks = text;
    lead.next_follow_up_action = action;
    if (!lead.follow_up_date || lead.follow_up_date < followUp) lead.follow_up_date = followUp;
    if (d.type === 'quotation' && ['Lead Generation', 'Contact Established', 'Requirement Understood', ''].includes(lead.stage || '')) { lead.stage = 'Quotation Sent'; lead.status = lead.stage; lead.lead_stage = lead.stage; }
    lead.last_contacted_at = nowIso();
    lead.updated_at = nowIso();
    dbSync.saveLead(lead);
  }
  return ApiResponse.success(res, view(d), first && lead ? 'Marked as sent and noted on the lead' : 'Marked as sent');
};

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

const fileName = (d) => `${d.type === 'proforma' ? 'Proforma' : 'Quotation'}-${d.number}-${(d.buyer.company || 'buyer').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 40)}.pdf`;

const sendPdf = async (res, d, inline) => {
  const owner = dataStore.users.find((u) => u.id === d.owner_id) || { id: d.owner_id };
  const buf = await pdf.render(d, profileWithDefaults(owner));
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${fileName(d)}"`, 'Cache-Control': 'private, no-store' });
  return res.end(buf);
};

const getPdf = async (req, res) => {
  const d = findDoc(req);
  if (!d) return ApiResponse.error(res, 'Document not found', 404);
  return sendPdf(res, d, req.query.inline === '1');
};

/** Public: the buyer opens the PDF from the share link. */
const sharedPdf = async (req, res) => {
  const token = String(req.params.token || '').replace(/\.pdf$/, '');
  const d = token.length >= 20 ? all().find((r) => r.kind === 'sales_doc' && r.share_token === token) : null;
  if (!d) return res.status(404).type('text/plain').send('This document is not available any more.');
  d.viewed_at = d.viewed_at || nowIso();
  d.last_viewed_at = nowIso();
  d.views = (d.views || 0) + 1;
  save(d);
  return sendPdf(res, d, true);
};

/** Owner / maker: a new share link (the old one stops working). */
const newShareLink = async (req, res) => {
  const d = findDoc(req);
  if (!d) return ApiResponse.error(res, 'Document not found', 404);
  d.share_token = crypto.randomBytes(18).toString('base64url');
  d.updated_at = nowIso();
  save(d);
  return ApiResponse.success(res, view(d), 'New link made; the old link no longer works');
};

module.exports = {
  requireAccess, ownerOnly, getProfile, saveProfile,
  prefill, listDocs, getDoc, createDoc, updateDoc, deleteDoc, convertDoc, markSent, getPdf, sharedPdf, newShareLink,
  DEFAULT_TERMS,
};
