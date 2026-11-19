/**
 * WhatsApp marketing (premium, per company), on the official WhatsApp Business Cloud API (Meta).
 *
 * - Setup: the owner connects the company's own WhatsApp Business number (Phone number ID, WABA ID, access token).
 * - Templates: created here, approved by Meta; may have a picture, variables {{1}}, buttons.
 * - Broadcasts: a template to leads picked by tag / all / pasted numbers; per-number delivery log and an estimated cost.
 * - Webhook: Meta tells us sent / delivered / read / failed and sends the buyers' replies (chat inbox).
 * - Automation: welcome message, keyword auto-replies, and STOP = opt out.
 */
const crypto = require('crypto');
const ApiResponse = require('../utils/apiResponse');
const config = require('../config/env');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { isSuperAdmin, isOwnerUser } = require('../utils/access');
const { isLeadInUserScope } = require('../utils/tenantScope');
const mailer = require('../services/mailer.service');
const graph = require('../services/whatsappGraph.service');

const DAY = 24 * 3600 * 1000;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const digits = (v) => String(v || '').replace(/[^0-9]/g, '');
const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

const all = () => dataStore.waRecords || (dataStore.waRecords = []);
const recs = (owner, kind) => all().filter((r) => r.owner_id === owner && r.kind === kind);
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
const settingsOf = (owner) => all().find((r) => r.kind === 'settings' && r.owner_id === owner) || null;

/* ------------------------------------------------------------------ */
/* Access                                                              */
/* ------------------------------------------------------------------ */

const featureOn = (user) => {
  if (isSuperAdmin(user)) return true;
  const rec = dataStore.users.find((u) => u.id === user.id) || user;
  return Boolean(rec.features && rec.features.whatsapp_marketing);
};

const requireFeature = (req, res, next) => {
  if (!isOwnerUser(req.user)) return res.status(403).json({ success: false, code: 'OWNER_ONLY', message: 'Only the company owner can use WhatsApp Marketing.' });
  if (!featureOn(req.user)) return res.status(403).json({ success: false, code: 'FEATURE_DISABLED', message: 'WhatsApp Marketing is a premium feature. Ask the platform admin to switch it on for your company.' });
  return next();
};

const token = (s) => (s && s.token_enc ? mailer.decryptSecret(s.token_enc) : '');
const ready = (s) => Boolean(s && s.phone_number_id && s.waba_id && s.token_enc && s.connected_at);

/* ------------------------------------------------------------------ */
/* Cost (an estimate from the company's own rate table)                */
/* ------------------------------------------------------------------ */

// Starting values only: Meta's prices change and differ by country; the owner edits them in Setup.
const DEFAULT_RATES = {
  currency: 'USD',
  default: { marketing: 0.05, utility: 0.01 },
  countries: [{ prefix: '91', name: 'India', marketing: 0.0107, utility: 0.0014 }],
};
const ratesOf = (s) => (s && s.rates && s.rates.default ? s.rates : DEFAULT_RATES);
const costFor = (rates, to, category = 'marketing') => {
  const d = digits(to);
  const row = [...(rates.countries || [])].sort((a, b) => String(b.prefix).length - String(a.prefix).length).find((c) => c.prefix && d.startsWith(String(c.prefix)));
  const pick = row || rates.default || DEFAULT_RATES.default;
  const v = Number(pick[String(category).toLowerCase() === 'utility' ? 'utility' : 'marketing']);
  return Number.isFinite(v) ? v : 0;
};

// Meta's limit of new conversations a number may start in 24 hours
const TIER_LIMITS = { TIER_50: 50, TIER_250: 250, TIER_1K: 1000, TIER_10K: 10000, TIER_100K: 100000, TIER_UNLIMITED: Infinity };
const tierLimit = (s) => TIER_LIMITS[(s && s.tier) || 'TIER_250'] || 250;

/* ------------------------------------------------------------------ */
/* Settings / connection                                               */
/* ------------------------------------------------------------------ */

const webhookUrl = (s) => `${config.apiPublicUrl}/api/v1/whatsapp/webhook/${s.webhook_key}`;
const mask = (s) => (s ? {
  phone_number_id: s.phone_number_id || '',
  waba_id: s.waba_id || '',
  app_id: s.app_id || '',
  has_token: Boolean(s.token_enc),
  has_app_secret: Boolean(s.app_secret_enc),
  display_phone: s.display_phone || '',
  verified_name: s.verified_name || '',
  quality: s.quality || '',
  tier: s.tier || '',
  tier_limit: Number.isFinite(tierLimit(s)) ? tierLimit(s) : null,
  connected_at: s.connected_at || null,
  webhook_url: webhookUrl(s),
  verify_token: s.verify_token,
  webhook_seen_at: s.webhook_seen_at || null,
  rates: ratesOf(s),
  opt_out_keywords: s.opt_out_keywords || ['STOP', 'UNSUBSCRIBE'],
} : null);

const ensureSettings = (owner) => {
  let s = settingsOf(owner);
  if (!s) {
    s = save({
      id: generateId('was'),
      kind: 'settings',
      owner_id: owner,
      webhook_key: crypto.randomBytes(18).toString('base64url'),
      verify_token: crypto.randomBytes(12).toString('hex'),
      created_at: nowIso(),
    });
  }
  return s;
};

const getStatus = async (req, res) => {
  const owner = isOwnerUser(req.user);
  const s = owner ? settingsOf(req.user.id) : null;
  return ApiResponse.success(res, {
    is_owner: owner,
    enabled: owner && featureOn(req.user),
    connected: ready(s),
    display_phone: s ? s.display_phone || '' : '',
  });
};

const getSettings = async (req, res) => ApiResponse.success(res, mask(ensureSettings(req.user.id)));

const saveSettings = async (req, res) => {
  const b = req.body || {};
  const s = ensureSettings(req.user.id);
  const phoneId = str(b.phone_number_id, 40).replace(/\D/g, '') || s.phone_number_id;
  const wabaId = str(b.waba_id, 40).replace(/\D/g, '') || s.waba_id;
  const newToken = str(b.access_token, 1000).replace(/\s+/g, '');
  const tk = newToken || token(s);
  if (!phoneId || !wabaId || !tk) return ApiResponse.error(res, 'Phone number ID, WhatsApp Business Account ID and the access token are all needed.', 400);
  let info;
  try {
    info = await graph.getPhoneNumber(phoneId, tk);
  } catch (err) {
    return ApiResponse.error(res, `WhatsApp did not accept these details: ${err.message}`, 400);
  }
  Object.assign(s, {
    phone_number_id: phoneId,
    waba_id: wabaId,
    app_id: b.app_id !== undefined ? str(String(b.app_id), 40).replace(/\D/g, '') : s.app_id || '',
    token_enc: newToken ? mailer.encryptSecret(newToken) : s.token_enc,
    app_secret_enc: b.app_secret ? mailer.encryptSecret(str(b.app_secret, 200)) : s.app_secret_enc || '',
    display_phone: info.display_phone_number || '',
    verified_name: info.verified_name || '',
    quality: info.quality_rating || '',
    tier: info.messaging_limit_tier || s.tier || 'TIER_250',
    connected_at: nowIso(),
    updated_at: nowIso(),
  });
  save(s);
  return ApiResponse.success(res, mask(s), `Connected to ${s.display_phone || 'your WhatsApp number'}`);
};

const saveRates = async (req, res) => {
  const b = req.body || {};
  const s = ensureSettings(req.user.id);
  const n = (v) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.min(x, 10) : 0; };
  s.rates = {
    currency: str(b.currency, 6).toUpperCase() || 'USD',
    default: { marketing: n(b.default && b.default.marketing), utility: n(b.default && b.default.utility) },
    countries: (Array.isArray(b.countries) ? b.countries : []).slice(0, 100)
      .map((c) => ({ prefix: digits(c.prefix).slice(0, 5), name: str(c.name, 40), marketing: n(c.marketing), utility: n(c.utility) }))
      .filter((c) => c.prefix),
  };
  if (Array.isArray(b.opt_out_keywords)) s.opt_out_keywords = b.opt_out_keywords.map((k) => str(String(k), 30).toUpperCase()).filter(Boolean).slice(0, 10);
  s.updated_at = nowIso();
  save(s);
  return ApiResponse.success(res, mask(s), 'Saved');
};

const disconnect = async (req, res) => {
  const s = settingsOf(req.user.id);
  if (s) {
    Object.assign(s, { token_enc: '', app_secret_enc: '', connected_at: null, updated_at: nowIso() });
    save(s);
  }
  return ApiResponse.success(res, mask(s), 'WhatsApp number disconnected');
};

/* ------------------------------------------------------------------ */
/* Pictures for templates (public link, so WhatsApp can fetch them)    */
/* ------------------------------------------------------------------ */

const MAX_MEDIA = 1024 * 1024;
const uploadMedia = async (req, res) => {
  const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String((req.body && req.body.data_url) || ''));
  if (!m) return ApiResponse.error(res, 'Only JPG or PNG pictures can be used', 400);
  const buf = Buffer.from(m[2], 'base64');
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isJpg && !isPng) return ApiResponse.error(res, 'The file is not a real JPG or PNG picture', 400);
  if (buf.length > MAX_MEDIA) return ApiResponse.error(res, 'The picture is larger than 1 MB. Please use a smaller one.', 413);
  const rec = save({ id: `wam_${crypto.randomBytes(12).toString('hex')}`, kind: 'media', owner_id: req.user.id, mime: isPng ? 'image/png' : 'image/jpeg', size: buf.length, data: buf.toString('base64'), created_at: nowIso() });
  return ApiResponse.success(res, { id: rec.id, url: `${config.apiPublicUrl}/api/v1/whatsapp/media/${rec.id}` }, 'Picture uploaded', 201);
};

const getMedia = async (req, res) => {
  const rec = all().find((r) => r.kind === 'media' && r.id === req.params.id);
  if (!rec) return res.status(404).end();
  res.set({ 'Content-Type': rec.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
  return res.end(Buffer.from(rec.data, 'base64'));
};

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

const varCount = (text) => {
  const nums = [...String(text || '').matchAll(/\{\{(\d+)\}\}/g)].map((x) => Number(x[1]));
  return nums.length ? Math.max(...nums) : 0;
};

/** The form of the CRM -> Meta's "components" list. */
const buildComponents = (t, headerHandle) => {
  const comps = [];
  if (t.header_type === 'text' && t.header_text) comps.push({ type: 'HEADER', format: 'TEXT', text: t.header_text });
  if (t.header_type === 'image') comps.push({ type: 'HEADER', format: 'IMAGE', example: { header_handle: [headerHandle] } });
  const n = varCount(t.body);
  comps.push({ type: 'BODY', text: t.body, ...(n ? { example: { body_text: [Array.from({ length: n }, (_, i) => (t.body_examples || [])[i] || `sample ${i + 1}`)] } } : {}) });
  if (t.footer) comps.push({ type: 'FOOTER', text: t.footer });
  const buttons = (t.buttons || []).map((b) => (b.type === 'URL' ? { type: 'URL', text: b.text, url: b.url } : b.type === 'PHONE_NUMBER' ? { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone } : { type: 'QUICK_REPLY', text: b.text }));
  if (buttons.length) comps.push({ type: 'BUTTONS', buttons });
  return comps;
};

/** Meta's template -> what the CRM shows. */
const fromMeta = (owner, m, existing = {}) => {
  const c = m.components || [];
  const header = c.find((x) => x.type === 'HEADER');
  const body = c.find((x) => x.type === 'BODY');
  const footer = c.find((x) => x.type === 'FOOTER');
  const btns = (c.find((x) => x.type === 'BUTTONS') || {}).buttons || [];
  return {
    ...existing,
    id: existing.id || generateId('wat'),
    kind: 'template',
    owner_id: owner,
    meta_id: m.id || existing.meta_id || '',
    name: m.name,
    language: m.language,
    category: String(m.category || existing.category || 'MARKETING').toUpperCase(),
    status: String(m.status || existing.status || 'PENDING').toUpperCase(),
    rejected_reason: m.rejected_reason && m.rejected_reason !== 'NONE' ? m.rejected_reason : '',
    header_type: header ? (header.format === 'IMAGE' ? 'image' : header.format === 'TEXT' ? 'text' : 'none') : 'none',
    header_text: header && header.format === 'TEXT' ? header.text : '',
    header_media_id: existing.header_media_id || '',
    body: body ? body.text : existing.body || '',
    footer: footer ? footer.text : '',
    buttons: btns.map((b) => ({ type: b.type, text: b.text, url: b.url || '', phone: b.phone_number || '' })),
    variables: varCount(body ? body.text : ''),
    updated_at: nowIso(),
    created_at: existing.created_at || nowIso(),
  };
};

const listTemplates = async (req, res) => ApiResponse.success(res, recs(req.user.id, 'template').sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))));

const syncTemplates = async (req, res) => {
  const s = settingsOf(req.user.id);
  if (!ready(s)) return ApiResponse.error(res, 'Connect your WhatsApp number first', 400);
  let data;
  try { data = await graph.listTemplates(s.waba_id, token(s)); } catch (err) { return ApiResponse.error(res, err.message, 400); }
  const mine = recs(req.user.id, 'template');
  const seen = new Set();
  for (const m of data.data || []) {
    const existing = mine.find((t) => (m.id && t.meta_id === m.id) || (t.name === m.name && t.language === m.language));
    const rec = save(fromMeta(req.user.id, m, existing || {}));
    seen.add(rec.id);
  }
  // Templates deleted in Meta's manager are removed here too
  mine.filter((t) => t.meta_id && !seen.has(t.id)).forEach((t) => remove(t.id));
  return ApiResponse.success(res, recs(req.user.id, 'template'), `${seen.size} templates from WhatsApp`);
};

const NAME_RE = /^[a-z0-9_]{1,512}$/;
const createTemplate = async (req, res) => {
  const s = settingsOf(req.user.id);
  if (!ready(s)) return ApiResponse.error(res, 'Connect your WhatsApp number first', 400);
  const b = req.body || {};
  const name = str(b.name, 512).toLowerCase().replace(/\s+/g, '_');
  if (!NAME_RE.test(name)) return ApiResponse.error(res, 'Template name: small letters, numbers and _ only (e.g. turmeric_offer)', 400);
  const body = str(b.body, 1024);
  if (!body) return ApiResponse.error(res, 'Write the message text', 400);
  const category = ['MARKETING', 'UTILITY'].includes(String(b.category).toUpperCase()) ? String(b.category).toUpperCase() : 'MARKETING';
  const t = {
    name,
    language: str(b.language, 10) || 'en',
    category,
    header_type: ['text', 'image'].includes(b.header_type) ? b.header_type : 'none',
    header_text: str(b.header_text, 60),
    header_media_id: str(b.header_media_id, 60),
    body,
    body_examples: (Array.isArray(b.body_examples) ? b.body_examples : []).map((x) => str(String(x), 100)),
    footer: str(b.footer, 60),
    buttons: (Array.isArray(b.buttons) ? b.buttons : []).slice(0, 3)
      .map((x) => ({ type: ['URL', 'PHONE_NUMBER'].includes(x.type) ? x.type : 'QUICK_REPLY', text: str(x.text, 25), url: str(x.url, 2000), phone: str(x.phone, 20) }))
      .filter((x) => x.text),
  };
  if (t.header_type === 'text' && !t.header_text) return ApiResponse.error(res, 'Write the title (header) text, or choose no title', 400);
  let handle = '';
  if (t.header_type === 'image') {
    const media = recs(req.user.id, 'media').find((m) => m.id === t.header_media_id);
    if (!media) return ApiResponse.error(res, 'Upload the picture for the template first', 400);
    if (!s.app_id) return ApiResponse.error(res, 'A template with a picture needs your Meta App ID (add it in Setup)', 400);
    try { handle = await graph.uploadHeaderSample(s.app_id, token(s), Buffer.from(media.data, 'base64'), media.mime); } catch (err) { return ApiResponse.error(res, `Picture upload to WhatsApp failed: ${err.message}`, 400); }
  }
  let made;
  try {
    made = await graph.createTemplate(s.waba_id, token(s), { name, language: t.language, category, components: buildComponents(t, handle) });
  } catch (err) {
    return ApiResponse.error(res, `WhatsApp refused the template: ${err.message}`, 400);
  }
  const rec = save({
    id: generateId('wat'), kind: 'template', owner_id: req.user.id, meta_id: made.id || '',
    ...t, status: String(made.status || 'PENDING').toUpperCase(), rejected_reason: '', variables: varCount(body),
    created_at: nowIso(), updated_at: nowIso(),
  });
  return ApiResponse.success(res, rec, 'Template sent to WhatsApp for approval (usually a few minutes)', 201);
};

const deleteTemplate = async (req, res) => {
  const t = recs(req.user.id, 'template').find((x) => x.id === req.params.id);
  if (!t) return ApiResponse.error(res, 'Template not found', 404);
  const s = settingsOf(req.user.id);
  if (ready(s) && t.meta_id) {
    try { await graph.deleteTemplate(s.waba_id, token(s), t.name); } catch (err) { if (err.status !== 404) return ApiResponse.error(res, err.message, 400); }
  }
  remove(t.id);
  return ApiResponse.success(res, { id: t.id }, 'Template deleted');
};

/* ------------------------------------------------------------------ */
/* Audience                                                            */
/* ------------------------------------------------------------------ */

const ownerLeads = (user) => dataStore.leads.filter((l) => isLeadInUserScope(l, user));
const leadNumber = (l) => digits(l.whatsapp || (Array.isArray(l.contacts) && l.contacts[0] && l.contacts[0].phone) || l.phone);
const optedOut = (owner) => new Set(recs(owner, 'contact').filter((c) => c.opted_out).map((c) => c.wa_id));

const buildAudience = (user, audience = {}) => {
  const mode = ['tags', 'custom'].includes(audience.mode) ? audience.mode : 'all';
  const out = optedOut(user.id);
  let picked = [];
  if (mode === 'custom') {
    const raw = Array.isArray(audience.numbers) ? audience.numbers : String(audience.numbers || '').split(/[,;\n\r\t]+/); // spaces inside a number are fine
    picked = raw.map((n) => ({ to: digits(n), name: '', company: '', country: '', product: '', lead_id: null }));
  } else {
    const wanted = (Array.isArray(audience.tags) ? audience.tags : String(audience.tags || '').split(',')).map((t) => String(t).trim().toLowerCase()).filter(Boolean);
    picked = ownerLeads(user)
      .filter((l) => mode === 'all' || (Array.isArray(l.tags) && l.tags.some((t) => wanted.includes(String(t).toLowerCase()))))
      .map((l) => ({
        to: leadNumber(l),
        name: l.contact_person || (l.contacts && l.contacts[0] && l.contacts[0].name) || '',
        company: l.company_name || l.name || '',
        country: String(l.country || '').replace(/[\uD83C-􏰀-\uDFFF]+/g, '').trim(),
        product: l.product || (Array.isArray(l.products) ? l.products.join(', ') : ''),
        lead_id: l.id,
      }));
  }
  const seen = new Set();
  const recipients = [];
  let skipped = 0;
  for (const r of picked) {
    if (r.to.length < 8 || r.to.length > 15 || seen.has(r.to) || out.has(r.to)) { skipped += 1; continue; }
    seen.add(r.to);
    recipients.push({ ...r, status: 'pending', error: '', wamid: '' });
  }
  return { mode, tags: audience.tags || [], recipients, skipped };
};

/** Tags on the company's leads, with how many of those leads have a WhatsApp number. */
const listTags = async (req, res) => {
  const counts = new Map();
  const out = optedOut(req.user.id);
  for (const l of ownerLeads(req.user)) {
    const n = leadNumber(l);
    const ok = n.length >= 8 && !out.has(n);
    for (const t of Array.isArray(l.tags) ? l.tags : []) {
      const k = String(t).trim().toLowerCase();
      if (!k) continue;
      const cur = counts.get(k) || { tag: String(t).trim(), leads: 0, with_whatsapp: 0 };
      cur.leads += 1;
      if (ok) cur.with_whatsapp += 1;
      counts.set(k, cur);
    }
  }
  return ApiResponse.success(res, [...counts.values()].sort((a, b) => b.leads - a.leads || a.tag.localeCompare(b.tag)));
};

const previewAudience = async (req, res) => {
  const built = buildAudience(req.user, { mode: req.query.mode, tags: req.query.tags ? String(req.query.tags).split(',') : [], numbers: req.query.numbers || '' });
  const rates = ratesOf(settingsOf(req.user.id));
  const cost = built.recipients.reduce((s, r) => s + costFor(rates, r.to, req.query.category || 'marketing'), 0);
  return ApiResponse.success(res, { count: built.recipients.length, skipped: built.skipped, est_cost: Math.round(cost * 100) / 100, currency: rates.currency, sample: built.recipients.slice(0, 6).map((r) => ({ to: r.to, company: r.company })) });
};

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

const FIELDS = ['company_name', 'contact_name', 'country', 'product', 'sender_name'];
const varValue = (v, r, senderName) => {
  if (!v || v.source === 'text') return str(v && v.text, 200) || '-';
  const map = { company_name: r.company, contact_name: r.name, country: r.country, product: r.product, sender_name: senderName };
  return str(map[v.field] || '', 200) || str(v.fallback, 100) || '-';
};

const templatePayload = (tpl, vars, r, senderName) => {
  const components = [];
  if (tpl.header_type === 'image' && tpl.header_media_id) {
    components.push({ type: 'header', parameters: [{ type: 'image', image: { link: `${config.apiPublicUrl}/api/v1/whatsapp/media/${tpl.header_media_id}` } }] });
  }
  if (tpl.variables) components.push({ type: 'body', parameters: Array.from({ length: tpl.variables }, (_, i) => ({ type: 'text', text: varValue((vars || [])[i], r, senderName) })) });
  return { type: 'template', template: { name: tpl.name, language: { code: tpl.language || 'en' }, ...(components.length ? { components } : {}) } };
};

/** What the message looked like, for the chat history. */
const renderText = (tpl, vars, r, senderName) => String(tpl.body || '').replace(/\{\{(\d+)\}\}/g, (m, n) => varValue((vars || [])[Number(n) - 1], r, senderName));

const touchContact = (owner, waId, patch) => {
  const id = `wac_${owner}_${waId}`;
  const c = all().find((x) => x.id === id) || { id, kind: 'contact', owner_id: owner, wa_id: waId, name: '', unread: 0, opted_out: false, created_at: nowIso() };
  if (!c.lead_id) {
    const lead = dataStore.leads.find((l) => l.owner_id === owner && (leadNumber(l) === waId || (l.extra_whatsapp || []).some((n) => digits(n) === waId)));
    if (lead) { c.lead_id = lead.id; c.name = c.name || lead.company_name || lead.name || ''; }
  }
  Object.assign(c, patch);
  return save(c);
};

const logOut = (owner, { to, text, type, template, wamid, status, error, campaignId, category, cost }) => {
  const msg = save({ id: generateId('wamsg'), kind: 'message', owner_id: owner, wa_id: to, direction: 'out', type, text, template_name: template || '', wamid: wamid || '', status, error: error || '', campaign_id: campaignId || '', category: category || '', cost: cost || 0, created_at: nowIso(), status_at: nowIso() });
  touchContact(owner, to, { last_out_at: nowIso(), last_text: text.slice(0, 120), last_at: nowIso() });
  return msg;
};

const sentLast24h = (owner) => {
  const since = Date.now() - DAY;
  return new Set(recs(owner, 'message').filter((m) => m.direction === 'out' && m.type === 'template' && m.status !== 'failed' && Date.parse(m.created_at) >= since).map((m) => m.wa_id)).size;
};

const runCampaign = async (c, owner) => {
  const s = settingsOf(owner);
  const tpl = recs(owner, 'template').find((t) => t.id === c.template_id);
  const user = dataStore.users.find((u) => u.id === owner) || {};
  const rates = ratesOf(s);
  const limit = tierLimit(s);
  let since = 0;
  for (const r of c.recipients) {
    if (r.status !== 'pending') continue;
    if (sentLast24h(owner) >= limit) {
      c.status = 'waiting_limit';
      c.resume_at = new Date(Date.now() + 3600 * 1000).toISOString();
      c.error = `WhatsApp allows this number ${limit} new chats in 24 hours. The rest continue by themselves later.`;
      save(c);
      return;
    }
    const text = renderText(tpl, c.variables, r, user.name || '');
    const cost = costFor(rates, r.to, tpl.category);
    try {
      const resp = await graph.sendMessage(s.phone_number_id, token(s), { to: r.to, ...templatePayload(tpl, c.variables, r, user.name || '') });
      r.wamid = (resp.messages && resp.messages[0] && resp.messages[0].id) || '';
      r.status = 'sent';
      r.sent_at = nowIso();
      r.cost = cost;
      logOut(owner, { to: r.to, text, type: 'template', template: tpl.name, wamid: r.wamid, status: 'sent', campaignId: c.id, category: tpl.category, cost });
    } catch (err) {
      r.status = 'failed';
      r.error = String(err.message || err).slice(0, 200);
      logOut(owner, { to: r.to, text, type: 'template', template: tpl.name, status: 'failed', error: r.error, campaignId: c.id, category: tpl.category });
    }
    since += 1;
    if (since % 10 === 0) save(c);
    await sleep(Number(process.env.WA_SEND_DELAY_MS || 120));
  }
  c.status = c.recipients.some((r) => r.status === 'sent') ? 'sent' : 'failed';
  c.finished_at = nowIso();
  c.resume_at = null;
  save(c);
};

const counts = (c) => {
  const by = (st) => c.recipients.filter((r) => r.status === st).length;
  const read = by('read');
  const delivered = by('delivered') + read;
  const sent = by('sent') + delivered;
  return { total: c.recipients.length, sent, delivered, read, failed: by('failed'), pending: by('pending'), replied: c.recipients.filter((r) => r.replied_at).length, cost: Math.round(c.recipients.reduce((s, r) => s + (r.cost || 0), 0) * 10000) / 10000 };
};
const summarize = (c) => { const { recipients, ...rest } = c; return { ...rest, stats: counts(c) }; };

const launch = (c, owner) => {
  const s = settingsOf(owner);
  if (!ready(s)) return { status: 400, message: 'Connect your WhatsApp number first' };
  const tpl = recs(owner, 'template').find((t) => t.id === c.template_id);
  if (!tpl) return { status: 400, message: 'The template of this broadcast was deleted' };
  if (tpl.status !== 'APPROVED') return { status: 400, message: `The template "${tpl.name}" is not approved by WhatsApp yet (${tpl.status.toLowerCase()})` };
  if (c.status === 'sending') return { status: 409, message: 'This broadcast is already sending' };
  if (!c.recipients.some((r) => r.status === 'pending')) return { status: 400, message: 'Nobody left to send to' };
  c.status = 'sending';
  c.started_at = c.started_at || nowIso();
  c.error = '';
  save(c);
  runCampaign(c, owner).catch((err) => { c.status = 'failed'; c.error = String(err.message || err).slice(0, 200); save(c); });
  return { ok: true };
};

const createCampaign = async (req, res) => {
  const b = req.body || {};
  const tpl = recs(req.user.id, 'template').find((t) => t.id === b.template_id);
  if (!tpl) return ApiResponse.error(res, 'Pick a template', 400);
  const built = buildAudience(req.user, b.audience || {});
  if (!built.recipients.length) return ApiResponse.error(res, 'No WhatsApp numbers in this audience. Add numbers (with country code) to the leads, or paste them.', 400);
  const variables = Array.from({ length: tpl.variables || 0 }, (_, i) => {
    const v = (b.variables || [])[i] || {};
    return v.source === 'field' && FIELDS.includes(v.field) ? { source: 'field', field: v.field, fallback: str(v.fallback, 100) } : { source: 'text', text: str(v.text, 200) };
  });
  let at = null;
  if (b.scheduled_at) {
    const t = Date.parse(b.scheduled_at);
    if (!Number.isFinite(t) || t < Date.now() + 60000) return ApiResponse.error(res, 'Pick a time at least 1 minute from now', 400);
    at = new Date(t).toISOString();
  }
  const rates = ratesOf(settingsOf(req.user.id));
  const c = save({
    id: generateId('wab'), kind: 'campaign', owner_id: req.user.id,
    name: str(b.name, 120) || tpl.name, template_id: tpl.id, template_name: tpl.name, category: tpl.category,
    audience: { mode: built.mode, tags: built.tags }, variables, recipients: built.recipients,
    est_cost: Math.round(built.recipients.reduce((s, r) => s + costFor(rates, r.to, tpl.category), 0) * 100) / 100, currency: rates.currency,
    status: at ? 'scheduled' : 'draft', scheduled_at: at, created_at: nowIso(), created_by: req.user.name || '',
  });
  if (b.send_now && !at) {
    const r = launch(c, req.user.id);
    if (!r.ok) return ApiResponse.error(res, r.message, r.status);
  }
  return ApiResponse.success(res, summarize(c), at ? 'Broadcast scheduled' : b.send_now ? `Sending to ${c.recipients.length} numbers` : 'Broadcast saved', 201);
};

const listCampaigns = async (req, res) => ApiResponse.success(res, recs(req.user.id, 'campaign').sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map(summarize));
const getCampaign = async (req, res) => {
  const c = recs(req.user.id, 'campaign').find((x) => x.id === req.params.id);
  return c ? ApiResponse.success(res, { ...c, stats: counts(c) }) : ApiResponse.error(res, 'Broadcast not found', 404);
};
const sendCampaign = async (req, res) => {
  const c = recs(req.user.id, 'campaign').find((x) => x.id === req.params.id);
  if (!c) return ApiResponse.error(res, 'Broadcast not found', 404);
  if (req.body && req.body.retry_failed) c.recipients.forEach((r) => { if (r.status === 'failed') { r.status = 'pending'; r.error = ''; } });
  const r = launch(c, req.user.id);
  return r.ok ? ApiResponse.success(res, summarize(c), 'Sending') : ApiResponse.error(res, r.message, r.status);
};
const deleteCampaign = async (req, res) => {
  const c = recs(req.user.id, 'campaign').find((x) => x.id === req.params.id);
  if (!c) return ApiResponse.error(res, 'Broadcast not found', 404);
  if (c.status === 'sending') return ApiResponse.error(res, 'Wait until it has finished sending', 409);
  remove(c.id);
  return ApiResponse.success(res, { id: c.id }, 'Broadcast deleted');
};

/* ------------------------------------------------------------------ */
/* Chats                                                               */
/* ------------------------------------------------------------------ */

const windowOpen = (c) => Boolean(c && c.last_in_at && Date.now() - Date.parse(c.last_in_at) < DAY);

const listChats = async (req, res) => {
  const list = recs(req.user.id, 'contact').filter((c) => c.last_at)
    .sort((a, b) => String(b.last_at).localeCompare(String(a.last_at)))
    .slice(0, 300)
    .map((c) => ({ ...c, window_open: windowOpen(c), window_ends_at: c.last_in_at ? new Date(Date.parse(c.last_in_at) + DAY).toISOString() : null }));
  return ApiResponse.success(res, list);
};

const getChat = async (req, res) => {
  const waId = digits(req.params.waId);
  const c = all().find((x) => x.id === `wac_${req.user.id}_${waId}`);
  if (!c) return ApiResponse.error(res, 'Chat not found', 404);
  if (c.unread) { c.unread = 0; save(c); }
  const messages = recs(req.user.id, 'message').filter((m) => m.wa_id === waId).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).slice(-300);
  return ApiResponse.success(res, { contact: { ...c, window_open: windowOpen(c) }, messages });
};

const sendText = async (owner, to, text) => {
  const s = settingsOf(owner);
  const resp = await graph.sendMessage(s.phone_number_id, token(s), { to, type: 'text', text: { body: text, preview_url: true } });
  return (resp.messages && resp.messages[0] && resp.messages[0].id) || '';
};

const replyInChat = async (req, res) => {
  const waId = digits(req.params.waId);
  const s = settingsOf(req.user.id);
  if (!ready(s)) return ApiResponse.error(res, 'Connect your WhatsApp number first', 400);
  const c = all().find((x) => x.id === `wac_${req.user.id}_${waId}`);
  const b = req.body || {};
  if (b.template_id) {
    const tpl = recs(req.user.id, 'template').find((t) => t.id === b.template_id && t.status === 'APPROVED');
    if (!tpl) return ApiResponse.error(res, 'Pick an approved template', 400);
    const lead = c && c.lead_id ? dataStore.leads.find((l) => l.id === c.lead_id) : null;
    const r = { to: waId, name: lead ? lead.contact_person || '' : (c && c.name) || '', company: lead ? lead.company_name || '' : '', country: lead ? lead.country || '' : '', product: lead ? lead.product || '' : '' };
    const vars = (b.variables || []).map((v) => (v && v.source === 'field' ? v : { source: 'text', text: str(v && v.text, 200) }));
    const text = renderText(tpl, vars, r, req.user.name || '');
    try {
      const resp = await graph.sendMessage(s.phone_number_id, token(s), { to: waId, ...templatePayload(tpl, vars, r, req.user.name || '') });
      const msg = logOut(req.user.id, { to: waId, text, type: 'template', template: tpl.name, wamid: resp.messages && resp.messages[0] && resp.messages[0].id, status: 'sent', category: tpl.category, cost: costFor(ratesOf(s), waId, tpl.category) });
      return ApiResponse.success(res, msg, 'Template sent');
    } catch (err) {
      return ApiResponse.error(res, err.message, 400);
    }
  }
  const text = str(b.text, 4000);
  if (!text) return ApiResponse.error(res, 'Write a message', 400);
  if (!windowOpen(c)) return ApiResponse.error(res, 'More than 24 hours since this buyer last wrote. WhatsApp only allows an approved template now.', 400);
  try {
    const wamid = await sendText(req.user.id, waId, text);
    const msg = logOut(req.user.id, { to: waId, text, type: 'text', wamid, status: 'sent' });
    return ApiResponse.success(res, msg, 'Sent');
  } catch (err) {
    return ApiResponse.error(res, err.message, 400);
  }
};

/* ------------------------------------------------------------------ */
/* Automation rules                                                    */
/* ------------------------------------------------------------------ */

const cleanRule = (b = {}) => ({
  name: str(b.name, 80) || 'Auto reply',
  trigger: ['welcome', 'keyword'].includes(b.trigger) ? b.trigger : 'keyword',
  match: b.match === 'exact' ? 'exact' : 'contains',
  keywords: (Array.isArray(b.keywords) ? b.keywords : String(b.keywords || '').split(',')).map((k) => str(String(k), 40).toLowerCase()).filter(Boolean).slice(0, 20),
  reply: str(b.reply, 1000),
  active: b.active !== false,
});
const listRules = async (req, res) => ApiResponse.success(res, recs(req.user.id, 'rule'));
const saveRule = async (req, res) => {
  const r = cleanRule(req.body);
  if (!r.reply) return ApiResponse.error(res, 'Write the reply message', 400);
  if (r.trigger === 'keyword' && !r.keywords.length) return ApiResponse.error(res, 'Add at least one keyword', 400);
  const existing = req.params.id ? recs(req.user.id, 'rule').find((x) => x.id === req.params.id) : null;
  if (req.params.id && !existing) return ApiResponse.error(res, 'Rule not found', 404);
  const rec = save({ ...(existing || { id: generateId('war'), kind: 'rule', owner_id: req.user.id, created_at: nowIso(), hits: 0 }), ...r, updated_at: nowIso() });
  return ApiResponse.success(res, rec, existing ? 'Rule saved' : 'Rule added', existing ? 200 : 201);
};
const deleteRule = async (req, res) => {
  const r = recs(req.user.id, 'rule').find((x) => x.id === req.params.id);
  if (!r) return ApiResponse.error(res, 'Rule not found', 404);
  remove(r.id);
  return ApiResponse.success(res, { id: r.id }, 'Rule deleted');
};

/** Runs on every buyer message: opt-out first, then a welcome for a first message, then keywords. */
const automate = async (owner, contact, text, isFirst) => {
  const s = settingsOf(owner);
  if (!ready(s)) return;
  const t = String(text || '').trim();
  const optWords = (s.opt_out_keywords || ['STOP', 'UNSUBSCRIBE']).map((k) => k.toUpperCase());
  const reply = async (body, rule) => {
    try {
      const wamid = await sendText(owner, contact.wa_id, body);
      logOut(owner, { to: contact.wa_id, text: body, type: 'text', wamid, status: 'sent' });
      if (rule) { rule.hits = (rule.hits || 0) + 1; rule.last_hit_at = nowIso(); save(rule); }
    } catch (err) { console.warn('[WhatsApp auto reply]', err.message); }
  };
  if (optWords.includes(t.toUpperCase())) {
    contact.opted_out = true;
    contact.opted_out_at = nowIso();
    save(contact);
    await reply('You will not get more offers from us on WhatsApp. Reply START to join again.');
    return;
  }
  if (t.toUpperCase() === 'START' && contact.opted_out) {
    contact.opted_out = false;
    save(contact);
    await reply('Welcome back! You will get our offers again.');
    return;
  }
  const rules = recs(owner, 'rule').filter((r) => r.active !== false);
  if (isFirst) {
    const w = rules.find((r) => r.trigger === 'welcome');
    if (w) { await reply(w.reply, w); return; }
  }
  const lower = t.toLowerCase();
  const k = rules.find((r) => r.trigger === 'keyword' && r.keywords.some((kw) => (r.match === 'exact' ? lower === kw : lower.includes(kw))));
  if (k) await reply(k.reply, k);
};

/* ------------------------------------------------------------------ */
/* Webhook from Meta                                                   */
/* ------------------------------------------------------------------ */

const settingsByKey = (key) => all().find((r) => r.kind === 'settings' && r.webhook_key === key);

const verifyWebhook = (req, res) => {
  const s = settingsByKey(req.params.key);
  if (s && req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === s.verify_token) {
    return res.status(200).send(String(req.query['hub.challenge'] || ''));
  }
  return res.status(403).send('Forbidden');
};

const STATUS_RANK = { sent: 1, delivered: 2, read: 3, failed: 4 };

const receiveWebhook = async (req, res) => {
  const s = settingsByKey(req.params.key);
  if (!s) return res.status(404).end();
  if (s.app_secret_enc) {
    const sig = String(req.headers['x-hub-signature-256'] || '');
    const expected = `sha256=${crypto.createHmac('sha256', mailer.decryptSecret(s.app_secret_enc)).update(req.rawBody || Buffer.from(JSON.stringify(req.body || {}))).digest('hex')}`;
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return res.status(401).end();
  }
  res.status(200).end(); // Meta wants a quick 200; work continues below
  const owner = s.owner_id;
  s.webhook_seen_at = nowIso();
  save(s);
  const changes = ((req.body && req.body.entry) || []).flatMap((e) => e.changes || []).map((c) => c.value || {});
  for (const v of changes) {
    for (const st of v.statuses || []) {
      const status = String(st.status || '').toLowerCase();
      if (!STATUS_RANK[status]) continue;
      const msg = all().find((m) => m.kind === 'message' && m.owner_id === owner && m.wamid === st.id);
      if (msg && (STATUS_RANK[status] > (STATUS_RANK[msg.status] || 0) || status === 'failed')) {
        msg.status = status;
        msg.status_at = nowIso();
        if (st.pricing && st.pricing.category) msg.category = st.pricing.category;
        if (status === 'failed') msg.error = ((st.errors || [])[0] || {}).title || ((st.errors || [])[0] || {}).message || 'Not delivered';
        save(msg);
      }
      if (msg && msg.campaign_id) {
        const c = recs(owner, 'campaign').find((x) => x.id === msg.campaign_id);
        const r = c && c.recipients.find((x) => x.wamid === st.id);
        if (r && (STATUS_RANK[status] > (STATUS_RANK[r.status] || 0))) {
          r.status = status;
          if (status === 'failed') r.error = msg.error;
          save(c);
        }
      }
    }
    for (const m of v.messages || []) {
      const from = digits(m.from);
      if (!from) continue;
      const already = all().some((x) => x.kind === 'message' && x.owner_id === owner && x.wamid === m.id);
      if (already) continue;
      const name = ((v.contacts || []).find((c) => digits(c.wa_id) === from) || {}).profile?.name || '';
      const text = m.type === 'text' ? (m.text && m.text.body) || ''
        : m.type === 'button' ? (m.button && m.button.text) || ''
        : m.type === 'interactive' ? ((m.interactive && (m.interactive.button_reply || m.interactive.list_reply)) || {}).title || ''
        : `[${m.type}]`;
      const before = all().find((x) => x.id === `wac_${owner}_${from}`);
      const isFirst = !before || !before.last_in_at;
      save({ id: generateId('wamsg'), kind: 'message', owner_id: owner, wa_id: from, direction: 'in', type: m.type, text, wamid: m.id, status: 'received', created_at: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : nowIso() });
      const contact = touchContact(owner, from, { name: name || (before && before.name) || '', last_in_at: nowIso(), last_at: nowIso(), last_text: text.slice(0, 120), unread: ((before && before.unread) || 0) + 1 });
      // A reply to a broadcast counts on that broadcast
      for (const c of recs(owner, 'campaign')) {
        const r = c.recipients.find((x) => x.to === from && x.status !== 'pending' && !x.replied_at);
        if (r && Date.now() - Date.parse(r.sent_at || 0) < 7 * DAY) { r.replied_at = nowIso(); save(c); }
      }
      graph.markRead(s.phone_number_id, token(s), m.id);
      await automate(owner, contact, text, isFirst);
    }
  }
  return undefined;
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

const getDashboard = async (req, res) => {
  const owner = req.user.id;
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const since = Date.now() - days * DAY;
  const s = settingsOf(owner);
  const msgs = recs(owner, 'message').filter((m) => Date.parse(m.created_at) >= since);
  const out = msgs.filter((m) => m.direction === 'out');
  const ok = (st) => out.filter((m) => m.status === st).length;
  const read = ok('read');
  const delivered = ok('delivered') + read;
  const sent = ok('sent') + delivered;
  const failed = ok('failed');
  const cost = out.reduce((a, m) => a + (m.cost || 0), 0);
  const series = {};
  for (let i = 13; i >= 0; i -= 1) series[new Date(Date.now() - i * DAY).toISOString().slice(0, 10)] = { sent: 0, read: 0, replies: 0 };
  msgs.forEach((m) => {
    const d = series[String(m.created_at).slice(0, 10)];
    if (!d) return;
    if (m.direction === 'in') d.replies += 1;
    else if (m.status !== 'failed') { d.sent += 1; if (m.status === 'read') d.read += 1; }
  });
  const contacts = recs(owner, 'contact');
  const limit = tierLimit(s);
  const used = sentLast24h(owner);
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  return ApiResponse.success(res, {
    connected: ready(s),
    phone: s ? { display: s.display_phone, name: s.verified_name, quality: s.quality, tier: s.tier } : null,
    limit: { per_day: Number.isFinite(limit) ? limit : null, used_24h: used, left: Number.isFinite(limit) ? Math.max(0, limit - used) : null },
    totals: { sent, delivered, read, failed, replies: msgs.filter((m) => m.direction === 'in').length, cost: Math.round(cost * 100) / 100, currency: ratesOf(s).currency, delivered_rate: pct(delivered, sent), read_rate: pct(read, sent) },
    contacts: { total: contacts.length, opted_out: contacts.filter((c) => c.opted_out).length, open_chats: contacts.filter(windowOpen).length, unread: contacts.reduce((a, c) => a + (c.unread || 0), 0) },
    series: Object.entries(series).map(([date, v]) => ({ date, ...v })),
    templates: { approved: recs(owner, 'template').filter((t) => t.status === 'APPROVED').length, pending: recs(owner, 'template').filter((t) => t.status === 'PENDING').length },
    days,
  });
};

/* ------------------------------------------------------------------ */
/* Scheduler: scheduled broadcasts and ones waiting for the daily limit */
/* ------------------------------------------------------------------ */

let ticking = false;
const runScheduled = async (now = Date.now()) => {
  if (ticking) return 0;
  ticking = true;
  let started = 0;
  try {
    const due = all().filter((r) => r.kind === 'campaign' && ((r.status === 'scheduled' && Date.parse(r.scheduled_at) <= now) || (r.status === 'waiting_limit' && (!r.resume_at || Date.parse(r.resume_at) <= now))));
    for (const c of due) {
      const owner = dataStore.users.find((u) => u.id === c.owner_id);
      if (!owner || !featureOn(owner)) { c.status = 'failed'; c.error = 'Not sent: WhatsApp Marketing is switched off for this company.'; save(c); continue; }
      const prev = c.status;
      c.status = 'draft';
      const r = launch(c, c.owner_id);
      if (r.ok) started += 1;
      else { c.status = prev === 'scheduled' ? 'failed' : prev; c.error = r.message; save(c); }
    }
  } finally {
    ticking = false;
  }
  return started;
};
let timer = null;
const startWhatsAppScheduler = () => {
  if (timer) return;
  timer = setInterval(() => runScheduled().catch((e) => console.warn('[WhatsApp scheduler]', e.message)), 30000);
  if (timer.unref) timer.unref();
};

module.exports = {
  requireFeature, getStatus, getSettings, saveSettings, saveRates, disconnect,
  uploadMedia, getMedia,
  listTemplates, syncTemplates, createTemplate, deleteTemplate,
  listTags, previewAudience, createCampaign, listCampaigns, getCampaign, sendCampaign, deleteCampaign,
  listChats, getChat, replyInChat,
  listRules, saveRule, deleteRule,
  verifyWebhook, receiveWebhook,
  getDashboard, runScheduled, startWhatsAppScheduler,
  FIELDS, costFor, buildComponents,
};
