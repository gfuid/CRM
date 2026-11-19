/**
 * AI Calling (premium, per company): an ElevenLabs voice agent calls buyers from the company's own
 * phone number (imported in ElevenLabs from a SIP trunk such as Vobiz / Telnyx / Plivo, or from Twilio).
 *
 * - Setup: ElevenLabs API key + agent, the numbers in that account, which number calls which country,
 *   calling hours (buyer's local time), retries, cost rates, and the sales script (written to the agent).
 * - Campaigns: leads by tag / all / pasted numbers; calls go out only in each buyer's office hours.
 * - Results: transcript, summary, recording, outcome (interested / callback / not interested / no answer)
 *   saved on the call and written to the lead (remark, follow-up date, stage); interested buyers notify the owner.
 * Records live in the same store as WhatsApp (dataStore.waRecords / WaRecord) with kind ai_settings / ai_campaign / ai_call.
 */
const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { isSuperAdmin, isOwnerUser } = require('../utils/access');
const { isLeadInUserScope } = require('../utils/tenantScope');
const mailer = require('../services/mailer.service');
const el = require('../services/elevenlabs.service');
const { timeZoneFor, inWindow } = require('../utils/countryTime');

const HOUR = 3600 * 1000;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const digits = (v) => String(v || '').replace(/[^0-9]/g, '');
const nowIso = () => new Date().toISOString();
const num = (v, min, max, dflt) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt; };

/* ---------------- records ---------------- */
const all = () => dataStore.waRecords || (dataStore.waRecords = []);
const recs = (owner, kind) => all().filter((r) => r.owner_id === owner && r.kind === kind);
const save = (rec) => { const l = all(); const i = l.findIndex((r) => r.id === rec.id); if (i >= 0) l[i] = rec; else l.push(rec); dbSync.saveWaRecord(rec); return rec; };
const remove = (id) => { const l = all(); const i = l.findIndex((r) => r.id === id); if (i >= 0) l.splice(i, 1); dbSync.deleteWaRecord(id); };
const settingsOf = (owner) => all().find((r) => r.kind === 'ai_settings' && r.owner_id === owner) || null;

/* ---------------- access ---------------- */
const featureOn = (user) => {
  if (isSuperAdmin(user)) return true;
  const rec = dataStore.users.find((u) => u.id === user.id) || user;
  return Boolean(rec.features && rec.features.ai_calling);
};
const requireFeature = (req, res, next) => {
  if (!isOwnerUser(req.user)) return res.status(403).json({ success: false, code: 'OWNER_ONLY', message: 'Only the company owner can use AI Calling.' });
  if (!featureOn(req.user)) return res.status(403).json({ success: false, code: 'FEATURE_DISABLED', message: 'AI Calling is a premium feature. Ask the platform admin to switch it on for your company.' });
  return next();
};
const keyOf = (s) => (s && s.api_key_enc ? mailer.decryptSecret(s.api_key_enc) : '');
const ready = (s) => Boolean(s && s.api_key_enc && s.agent_id && (s.numbers || []).length && s.connected_at);

/* ---------------- defaults ---------------- */
const DEFAULT_WINDOW = { from_hour: 10, to_hour: 18, days: [1, 2, 3, 4, 5, 6] };
const DEFAULT_RATES = { currency: 'USD', ai_per_min: 0.09, phone_default_per_min: 0.15, countries: [{ prefix: '91', name: 'India', per_min: 0.012 }] };

const ensureSettings = (owner) => settingsOf(owner) || save({
  id: generateId('ais'), kind: 'ai_settings', owner_id: owner, numbers: [], country_numbers: [],
  window: DEFAULT_WINDOW, max_attempts: 2, retry_hours: 4, concurrency: 2, rates: DEFAULT_RATES, script: {}, created_at: nowIso(),
});

const mask = (s) => ({
  connected: ready(s),
  has_key: Boolean(s.api_key_enc),
  agent_id: s.agent_id || '',
  agent_name: s.agent_name || '',
  numbers: s.numbers || [],
  default_number_id: s.default_number_id || ((s.numbers || [])[0] || {}).id || '',
  country_numbers: s.country_numbers || [],
  window: s.window || DEFAULT_WINDOW,
  max_attempts: s.max_attempts ?? 2,
  retry_hours: s.retry_hours ?? 4,
  concurrency: s.concurrency ?? 2,
  rates: s.rates || DEFAULT_RATES,
  script: s.script || {},
  script_applied_at: s.script_applied_at || null,
  connected_at: s.connected_at || null,
});

const getStatus = async (req, res) => {
  const owner = isOwnerUser(req.user);
  const s = owner ? settingsOf(req.user.id) : null;
  return ApiResponse.success(res, { is_owner: owner, enabled: owner && featureOn(req.user), connected: ready(s) });
};
const getSettings = async (req, res) => ApiResponse.success(res, mask(ensureSettings(req.user.id)));

const mapNumbers = (list) => (Array.isArray(list) ? list : (list && list.phone_numbers) || []).map((n) => ({
  id: n.phone_number_id || n.id,
  number: n.phone_number || '',
  provider: n.provider === 'twilio' ? 'twilio' : 'sip_trunk',
  label: n.label || '',
  agent_id: (n.assigned_agent && (n.assigned_agent.agent_id || n.assigned_agent.id)) || '',
})).filter((n) => n.id);

/** Saves the ElevenLabs key + agent after checking them, and reads the phone numbers of that account. */
const connect = async (req, res) => {
  const b = req.body || {};
  const s = ensureSettings(req.user.id);
  const key = str(b.api_key, 200) || keyOf(s);
  const agentId = str(b.agent_id, 80) || s.agent_id;
  if (!key || !agentId) return ApiResponse.error(res, 'The ElevenLabs API key and the Agent ID are both needed.', 400);
  let agent;
  let numbers;
  try {
    agent = await el.getAgent(key, agentId);
    numbers = mapNumbers(await el.listPhoneNumbers(key));
  } catch (err) {
    return ApiResponse.error(res, `ElevenLabs did not accept these details: ${err.message}`, 400);
  }
  Object.assign(s, {
    api_key_enc: b.api_key ? mailer.encryptSecret(key) : s.api_key_enc,
    agent_id: agentId,
    agent_name: agent.name || '',
    numbers,
    default_number_id: numbers.some((n) => n.id === s.default_number_id) ? s.default_number_id : (numbers[0] || {}).id || '',
    connected_at: numbers.length ? nowIso() : null,
    updated_at: nowIso(),
  });
  save(s);
  if (!numbers.length) return ApiResponse.error(res, 'Connected to ElevenLabs, but there is no phone number in that account yet. Import your Vobiz / Twilio number in ElevenLabs → Phone Numbers, then press Save again.', 400);
  return ApiResponse.success(res, mask(s), `Connected to ElevenLabs: agent "${s.agent_name || agentId}", ${numbers.length} number${numbers.length === 1 ? '' : 's'}`);
};

const saveOptions = async (req, res) => {
  const b = req.body || {};
  const s = ensureSettings(req.user.id);
  const ids = new Set((s.numbers || []).map((n) => n.id));
  if (b.default_number_id !== undefined) s.default_number_id = ids.has(b.default_number_id) ? b.default_number_id : s.default_number_id;
  if (Array.isArray(b.country_numbers)) s.country_numbers = b.country_numbers.slice(0, 50).map((c) => ({ prefix: digits(c.prefix).slice(0, 5), number_id: str(c.number_id, 80) })).filter((c) => c.prefix && ids.has(c.number_id));
  if (b.window) {
    const days = (Array.isArray(b.window.days) ? b.window.days : []).map(Number).filter((d) => d >= 0 && d <= 6);
    s.window = { from_hour: num(b.window.from_hour, 0, 23, 10), to_hour: num(b.window.to_hour, 1, 24, 18), days: days.length ? [...new Set(days)] : DEFAULT_WINDOW.days };
    if (s.window.to_hour <= s.window.from_hour) return ApiResponse.error(res, 'The end time must be after the start time', 400);
  }
  if (b.max_attempts !== undefined) s.max_attempts = Math.round(num(b.max_attempts, 1, 5, 2));
  if (b.retry_hours !== undefined) s.retry_hours = num(b.retry_hours, 1, 72, 4);
  if (b.concurrency !== undefined) s.concurrency = Math.round(num(b.concurrency, 1, 10, 2));
  if (b.rates) {
    const r = b.rates;
    s.rates = {
      currency: str(r.currency, 6).toUpperCase() || 'USD',
      ai_per_min: num(r.ai_per_min, 0, 10, 0.09),
      phone_default_per_min: num(r.phone_default_per_min, 0, 10, 0.15),
      countries: (Array.isArray(r.countries) ? r.countries : []).slice(0, 100).map((c) => ({ prefix: digits(c.prefix).slice(0, 5), name: str(c.name, 40), per_min: num(c.per_min, 0, 10, 0) })).filter((c) => c.prefix),
    };
  }
  s.updated_at = nowIso();
  save(s);
  return ApiResponse.success(res, mask(s), 'Saved');
};

/* ---------------- the sales script, written into the ElevenLabs agent ---------------- */
const DATA_COLLECTION = {
  interested: { type: 'boolean', description: 'true if the buyer showed interest in buying, asked for a price, sample or quotation; false if they clearly said no.' },
  callback_date: { type: 'string', description: 'If the buyer asked to be called back: date and time as YYYY-MM-DD HH:mm in the buyer\'s own time. Empty otherwise.' },
  quantity: { type: 'string', description: 'Quantity the buyer needs, with unit (e.g. 20 MT per month). Empty if not said.' },
  email: { type: 'string', description: 'Email address the buyer gave for the price list or quotation. Empty if none.' },
  do_not_call: { type: 'boolean', description: 'true only if the buyer asked not to be called again.' },
  notes: { type: 'string', description: 'Other important points: target price, current supplier, specifications, port, payment terms.' },
};

const buildPrompt = (sc, companyName) => `You are an AI sales assistant calling on behalf of "${companyName}"${sc.company_intro ? `: ${sc.company_intro}` : ''}.
You are calling {{buyer_name}} of {{company_name}} in {{country}} about {{product}}.

What we sell:
${sc.product_info || '(products as described by the buyer\'s lead)'}

Goal of this call: ${sc.goal || 'find out if the buyer needs the product, the quantity and the target price, and offer to send a price list or quotation by email.'}

Rules:
- Say at the start that you are an AI assistant of ${companyName}. Be polite, short and natural; one question at a time.
- Speak the buyer's language; switch language if they do.
- Never promise prices, discounts, delivery dates or payment terms that are not written above; say the team will confirm by email.
- If the buyer is busy, ask for a better time to call back and confirm the date and time in their own time.
- If the buyer asks not to be called again, apologise, confirm, and end the call.
- Before ending, confirm their email for the price list if they are interested.
${sc.extra ? `\nAlso: ${sc.extra}` : ''}`;

const saveScript = async (req, res) => {
  const b = req.body || {};
  const s = ensureSettings(req.user.id);
  if (!s.api_key_enc || !s.agent_id) return ApiResponse.error(res, 'Connect ElevenLabs first', 400);
  const user = dataStore.users.find((u) => u.id === req.user.id) || req.user;
  const sc = {
    company_intro: str(b.company_intro, 600),
    product_info: str(b.product_info, 3000),
    goal: str(b.goal, 600),
    extra: str(b.extra, 1000),
    language: str(b.language, 10) || 'en',
    first_message: str(b.first_message, 400) || 'Hello {{buyer_name}}, this is the AI assistant of {{sender_company}}. Do you have one minute to talk about {{product}}?',
  };
  const company = user.company_name || user.name || 'our company';
  try {
    await el.updateAgent(keyOf(s), s.agent_id, {
      conversation_config: { agent: { first_message: sc.first_message, language: sc.language, prompt: { prompt: buildPrompt(sc, company) } } },
      platform_settings: { data_collection: DATA_COLLECTION },
    });
  } catch (err) {
    return ApiResponse.error(res, `ElevenLabs did not accept the script: ${err.message}`, 400);
  }
  s.script = sc;
  s.script_applied_at = nowIso();
  save(s);
  return ApiResponse.success(res, mask(s), 'Script saved to your ElevenLabs agent');
};

/* ---------------- numbers, cost ---------------- */
const pickNumber = (s, to) => {
  const d = digits(to);
  const row = [...(s.country_numbers || [])].sort((a, b) => b.prefix.length - a.prefix.length).find((c) => d.startsWith(c.prefix));
  const id = (row && row.number_id) || s.default_number_id || ((s.numbers || [])[0] || {}).id;
  return (s.numbers || []).find((n) => n.id === id) || null;
};
const phoneRate = (rates, to) => {
  const d = digits(to);
  const row = [...(rates.countries || [])].sort((a, b) => b.prefix.length - a.prefix.length).find((c) => d.startsWith(c.prefix));
  return row ? Number(row.per_min) || 0 : Number(rates.phone_default_per_min) || 0;
};
const costOf = (rates, to, secs) => Math.round(((secs || 0) / 60) * ((Number(rates.ai_per_min) || 0) + phoneRate(rates, to)) * 10000) / 10000;

/* ---------------- audience ---------------- */
const ownerLeads = (user) => dataStore.leads.filter((l) => isLeadInUserScope(l, user));
const leadPhone = (l) => digits((Array.isArray(l.contacts) && l.contacts[0] && l.contacts[0].phone) || l.phone || l.whatsapp);

const buildAudience = (user, a = {}) => {
  const mode = ['tags', 'custom'].includes(a.mode) ? a.mode : 'all';
  let picked = [];
  if (mode === 'custom') {
    picked = String(a.numbers || '').split(/[,;\n\r\t]+/).map((n) => ({ to: digits(n), name: '', company: '', country: '', product: '', lead_id: null }));
  } else {
    const wanted = (Array.isArray(a.tags) ? a.tags : String(a.tags || '').split(',')).map((t) => String(t).trim().toLowerCase()).filter(Boolean);
    picked = ownerLeads(user)
      .filter((l) => !l.do_not_call && (mode === 'all' || (Array.isArray(l.tags) && l.tags.some((t) => wanted.includes(String(t).toLowerCase())))))
      .map((l) => ({
        to: leadPhone(l),
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
    if (r.to.length < 8 || r.to.length > 15 || seen.has(r.to)) { skipped += 1; continue; }
    seen.add(r.to);
    recipients.push({ ...r, tz: timeZoneFor(r.country, r.to), status: 'pending', attempts: 0, next_at: null, outcome: '', call_id: '' });
  }
  return { mode, tags: a.tags || [], recipients, skipped };
};

const listTags = async (req, res) => {
  const counts = new Map();
  for (const l of ownerLeads(req.user)) {
    const ok = leadPhone(l).length >= 8 && !l.do_not_call;
    for (const t of Array.isArray(l.tags) ? l.tags : []) {
      const k = String(t).trim().toLowerCase();
      if (!k) continue;
      const cur = counts.get(k) || { tag: String(t).trim(), leads: 0, with_phone: 0 };
      cur.leads += 1;
      if (ok) cur.with_phone += 1;
      counts.set(k, cur);
    }
  }
  return ApiResponse.success(res, [...counts.values()].sort((a, b) => b.leads - a.leads));
};

const previewAudience = async (req, res) => {
  const built = buildAudience(req.user, { mode: req.query.mode, tags: req.query.tags ? String(req.query.tags).split(',') : [], numbers: req.query.numbers || '' });
  const s = ensureSettings(req.user.id);
  const est = built.recipients.reduce((a, r) => a + costOf(s.rates || DEFAULT_RATES, r.to, 120), 0);
  const countries = {};
  built.recipients.forEach((r) => { const k = r.country || `+${r.to.slice(0, 3)}`; countries[k] = (countries[k] || 0) + 1; });
  return ApiResponse.success(res, { count: built.recipients.length, skipped: built.skipped, est_cost_2min: Math.round(est * 100) / 100, currency: (s.rates || DEFAULT_RATES).currency, countries });
};

/* ---------------- placing calls ---------------- */
const variablesFor = (r, owner) => {
  const u = dataStore.users.find((x) => x.id === owner) || {};
  return { buyer_name: r.name || 'Sir', company_name: r.company || 'your company', country: r.country || '', product: r.product || 'our products', sender_company: u.company_name || u.name || 'our company' };
};

const placeCall = async (owner, r, { campaignId = '', test = false } = {}) => {
  const s = settingsOf(owner);
  const number = pickNumber(s, r.to);
  if (!number) throw new Error('No phone number set for this country');
  const resp = await el.outboundCall(keyOf(s), { provider: number.provider, agentId: s.agent_id, phoneNumberId: number.id, to: `+${r.to}`, variables: variablesFor(r, owner) });
  const convId = resp.conversation_id || resp.conversationId || '';
  if (!convId && resp.success === false) throw new Error(resp.message || 'ElevenLabs could not start the call');
  return save({
    id: generateId('aic'), kind: 'ai_call', owner_id: owner, campaign_id: campaignId, lead_id: r.lead_id || null, to: r.to,
    name: r.name || '', company: r.company || '', country: r.country || '', from_number: number.number, conversation_id: convId,
    status: 'calling', outcome: '', attempt: (r.attempts || 0) + 1, test, started_at: nowIso(), created_at: nowIso(),
  });
};

const testCall = async (req, res) => {
  const s = settingsOf(req.user.id);
  if (!ready(s)) return ApiResponse.error(res, 'Finish the setup first (ElevenLabs and a phone number)', 400);
  const to = digits(req.body && req.body.to);
  if (to.length < 8) return ApiResponse.error(res, 'Type your number with country code, e.g. +91 98765 43210', 400);
  try {
    const c = await placeCall(req.user.id, { to, name: req.user.name || 'Test', company: 'Test call', product: (s.script && s.script.product_info ? 'our products' : 'our products') }, { test: true });
    return ApiResponse.success(res, c, 'Calling you now');
  } catch (err) {
    return ApiResponse.error(res, `The call could not start: ${err.message}`, 400);
  }
};

/* ---------------- results ---------------- */
const DATE_RE = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?/;
const val = (dc, k) => (dc && dc[k] ? (dc[k].value !== undefined ? dc[k].value : dc[k]) : undefined);
const truthy = (v) => v === true || String(v).toLowerCase() === 'true';

const outcomeOf = (c) => {
  if (!c.answered) return 'no_answer';
  if (truthy(c.data.do_not_call)) return 'do_not_call';
  if (truthy(c.data.interested)) return 'interested';
  if (c.data.callback_date && DATE_RE.test(String(c.data.callback_date))) return 'callback';
  if (c.data.interested !== undefined && !truthy(c.data.interested) && String(c.data.interested).toLowerCase() === 'false') return 'not_interested';
  return 'answered';
};

const OUTCOME_TEXT = { interested: 'Interested', callback: 'Asked for a call back', not_interested: 'Not interested', do_not_call: 'Asked not to be called again', answered: 'Talked', no_answer: 'No answer' };

/** Writes the result of an answered call to the lead (remark history, follow-up date, stage). */
const updateLead = (owner, call) => {
  const lead = call.lead_id && dataStore.leads.find((l) => l.id === call.lead_id);
  if (!lead) return;
  const tomorrow = new Date(Date.now() + 24 * HOUR).toISOString().slice(0, 10);
  const cb = DATE_RE.exec(String(call.data.callback_date || ''));
  const extras = [call.data.quantity && `Qty: ${call.data.quantity}`, call.data.email && `Email: ${call.data.email}`, call.data.notes].filter(Boolean).join(' · ');
  const today = `AI call (${OUTCOME_TEXT[call.outcome] || call.outcome}): ${call.summary || ''}${extras ? ` — ${extras}` : ''}`.slice(0, 1500);
  const action = call.outcome === 'interested' ? `Send price list / quotation${call.data.email ? ` to ${call.data.email}` : ''}`
    : call.outcome === 'callback' ? `Call back${cb && cb[2] ? ` at ${cb[2]}` : ''} (buyer asked)`
    : call.outcome === 'do_not_call' ? 'Do not call again (buyer asked)' : '';
  if (call.outcome === 'do_not_call') lead.do_not_call = true;
  if (call.data.email && !lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(call.data.email)) lead.email = String(call.data.email).trim();
  const followUp = cb ? cb[1] : call.outcome === 'interested' ? tomorrow : lead.follow_up_date;
  if (cb && cb[2]) lead.follow_up_time = cb[2].padStart(5, '0');
  lead.previous_remarks = [{
    today_remark: today, planned_action: action,
    remark: [`Interaction: ${today}`, action ? `Planned for ${followUp}: ${action}` : null].filter(Boolean).join(' | '),
    follow_up_date: followUp, date: nowIso(), author: 'AI call', author_id: 'ai_call', ai_call_id: call.id,
  }, ...(lead.previous_remarks || [])];
  lead.today_remarks = today;
  if (action) lead.next_follow_up_action = action;
  if (followUp) lead.follow_up_date = followUp;
  if (call.outcome === 'interested' && ['Lead Generation', ''].includes(lead.stage || '')) { lead.stage = 'Contact Established'; lead.status = lead.stage; lead.lead_stage = lead.stage; }
  lead.last_contacted_at = nowIso();
  lead.updated_at = nowIso();
  dbSync.saveLead(lead);
};

const notifyOwner = (owner, call) => {
  const notif = {
    id: generateId('notif'), target: 'specific_user', target_user_id: owner, owner_id: owner, target_name: 'Company Owner',
    title: `AI call: ${call.company || `+${call.to}`} is interested`, message: `${call.summary || ''}`.slice(0, 300), type: 'success', priority: 'normal',
    kind: 'ai_call', ai_call_id: call.id, created_at: nowIso(), created_by: 'AI Calling', read_by: [],
  };
  (dataStore.notifications || (dataStore.notifications = [])).unshift(notif);
  dbSync.saveNotification(notif);
};

const finalize = (call, conv) => {
  const s = settingsOf(call.owner_id) || {};
  const turns = (conv.transcript || []).filter((t) => t && t.message).map((t) => ({ who: t.role === 'agent' ? 'ai' : 'buyer', text: String(t.message).slice(0, 2000), at: t.time_in_call_secs || 0 }));
  const secs = Math.round(Number(conv.metadata && conv.metadata.call_duration_secs) || 0);
  const dcRaw = (conv.analysis && conv.analysis.data_collection_results) || {};
  const data = Object.fromEntries(Object.keys(DATA_COLLECTION).map((k) => [k, val(dcRaw, k)]).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  Object.assign(call, {
    status: conv.status === 'failed' && !turns.length ? 'failed' : 'done',
    duration_secs: secs,
    transcript: turns,
    summary: str((conv.analysis && conv.analysis.transcript_summary) || '', 2000),
    data,
    answered: secs >= 8 && turns.some((t) => t.who === 'buyer'),
    ended_reason: str((conv.metadata && conv.metadata.termination_reason) || '', 200),
    has_audio: Boolean(conv.has_audio !== false && secs > 0),
    ended_at: nowIso(),
  });
  call.outcome = outcomeOf(call);
  call.cost = costOf(s.rates || DEFAULT_RATES, call.to, secs);
  save(call);
  if (call.answered && !call.test) updateLead(call.owner_id, call);
  if (call.outcome === 'interested' && !call.test) notifyOwner(call.owner_id, call);
  // Campaign bookkeeping: retry unanswered calls later, or close the number
  const c = call.campaign_id && recs(call.owner_id, 'ai_campaign').find((x) => x.id === call.campaign_id);
  const r = c && c.recipients.find((x) => x.call_id === call.id);
  if (r) {
    r.outcome = call.outcome;
    if (call.outcome === 'no_answer' && r.attempts < (s.max_attempts || 2)) {
      r.status = 'pending';
      r.next_at = new Date(Date.now() + (s.retry_hours || 4) * HOUR).toISOString();
    } else r.status = 'done';
    save(c);
  }
};

/* ---------------- the scheduler ---------------- */
// Rounds never overlap: a round asked for while one is running waits for it, then runs.
let queue = Promise.resolve();
const tick = (now = Date.now()) => {
  const run = queue.then(() => tickOnce(now));
  queue = run.catch(() => {});
  return run;
};
const tickOnce = async (now) => {
  let placed = 0;
  let finished = 0;
  try {
    // 1. Calls in progress: read their result when ElevenLabs has finished them
    for (const call of all().filter((r) => r.kind === 'ai_call' && r.status === 'calling')) {
      const s = settingsOf(call.owner_id);
      if (!s || !call.conversation_id) { call.status = 'failed'; save(call); continue; }
      try {
        const conv = await el.getConversation(keyOf(s), call.conversation_id);
        if (['done', 'failed'].includes(conv.status)) { finalize(call, conv); finished += 1; }
        else if (now - Date.parse(call.started_at) > 45 * 60 * 1000) { call.status = 'failed'; call.ended_reason = 'No result from ElevenLabs after 45 minutes'; save(call); }
      } catch (err) {
        if (err.status === 404 && now - Date.parse(call.started_at) > 10 * 60 * 1000) { call.status = 'failed'; call.ended_reason = 'Call not found in ElevenLabs'; save(call); }
      }
    }
    // 2. Running campaigns: start calls for buyers who are in their office hours now
    for (const c of all().filter((r) => r.kind === 'ai_campaign' && r.status === 'running')) {
      const owner = dataStore.users.find((u) => u.id === c.owner_id);
      const s = settingsOf(c.owner_id);
      if (!owner || !featureOn(owner) || !ready(s)) { c.status = 'paused'; c.error = 'Paused: AI Calling is switched off or not set up.'; save(c); continue; }
      if (c.start_at && Date.parse(c.start_at) > now) continue;
      let active = all().filter((r) => r.kind === 'ai_call' && r.owner_id === c.owner_id && r.status === 'calling').length;
      for (const r of c.recipients) {
        if (active >= (s.concurrency || 2)) break;
        if (r.status !== 'pending' || (r.next_at && Date.parse(r.next_at) > now)) continue;
        const lead = r.lead_id && dataStore.leads.find((l) => l.id === r.lead_id);
        if (lead && lead.do_not_call) { r.status = 'done'; r.outcome = 'do_not_call'; continue; }
        if (!inWindow(r.tz, s.window, now)) continue;
        r.attempts += 1;
        try {
          const call = await placeCall(c.owner_id, r, { campaignId: c.id });
          r.status = 'calling';
          r.call_id = call.id;
          active += 1;
          placed += 1;
        } catch (err) {
          r.status = r.attempts < (s.max_attempts || 2) ? 'pending' : 'done';
          r.outcome = r.status === 'done' ? 'failed' : '';
          r.next_at = new Date(now + (s.retry_hours || 4) * HOUR).toISOString();
          r.error = String(err.message || err).slice(0, 200);
        }
      }
      if (!c.recipients.some((r) => r.status === 'pending' || r.status === 'calling')) { c.status = 'done'; c.finished_at = nowIso(); }
      save(c);
    }
  } catch (err) {
    console.warn('[AI calls round]', err.message);
  }
  return { placed, finished };
};
let timer = null;
const startAiCallScheduler = () => {
  if (timer) return;
  timer = setInterval(() => tick().catch((e) => console.warn('[AI calls]', e.message)), Number(process.env.AI_CALL_TICK_MS || 20000));
  if (timer.unref) timer.unref();
};

/* ---------------- campaigns API ---------------- */
const stats = (c) => {
  const calls = recs(c.owner_id, 'ai_call').filter((x) => x.campaign_id === c.id);
  const by = (o) => c.recipients.filter((r) => r.outcome === o).length;
  return {
    total: c.recipients.length,
    called: c.recipients.filter((r) => r.attempts > 0).length,
    answered: calls.filter((x) => x.answered).length,
    interested: by('interested'), callback: by('callback'), not_interested: by('not_interested'), no_answer: by('no_answer'),
    pending: c.recipients.filter((r) => r.status === 'pending').length,
    minutes: Math.round(calls.reduce((a, x) => a + (x.duration_secs || 0), 0) / 6) / 10,
    cost: Math.round(calls.reduce((a, x) => a + (x.cost || 0), 0) * 100) / 100,
  };
};
const summarize = (c) => { const { recipients, ...rest } = c; return { ...rest, stats: stats(c) }; };

const createCampaign = async (req, res) => {
  const s = settingsOf(req.user.id);
  if (!ready(s)) return ApiResponse.error(res, 'Finish the setup first (ElevenLabs and a phone number)', 400);
  if (!s.script_applied_at) return ApiResponse.error(res, 'Save the sales script to your agent first (Setup → Script)', 400);
  const b = req.body || {};
  const built = buildAudience(req.user, b.audience || {});
  if (!built.recipients.length) return ApiResponse.error(res, 'No phone numbers in this audience. Add numbers with country code to the leads, or paste them.', 400);
  let startAt = null;
  if (b.start_at) {
    const t = Date.parse(b.start_at);
    if (!Number.isFinite(t)) return ApiResponse.error(res, 'The start time is not a valid date', 400);
    startAt = new Date(t).toISOString();
  }
  const c = save({ id: generateId('aicp'), kind: 'ai_campaign', owner_id: req.user.id, name: str(b.name, 120) || 'AI call campaign', audience: { mode: built.mode, tags: built.tags }, recipients: built.recipients, status: 'running', start_at: startAt, created_at: nowIso(), created_by: req.user.name || '' });
  tick().catch(() => {});
  return ApiResponse.success(res, summarize(c), `${c.recipients.length} buyers will be called in their office hours`, 201);
};
const listCampaigns = async (req, res) => ApiResponse.success(res, recs(req.user.id, 'ai_campaign').sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map(summarize));
const getCampaign = async (req, res) => {
  const c = recs(req.user.id, 'ai_campaign').find((x) => x.id === req.params.id);
  return c ? ApiResponse.success(res, { ...c, stats: stats(c) }) : ApiResponse.error(res, 'Campaign not found', 404);
};
const setCampaignState = (state) => async (req, res) => {
  const c = recs(req.user.id, 'ai_campaign').find((x) => x.id === req.params.id);
  if (!c) return ApiResponse.error(res, 'Campaign not found', 404);
  if (c.status === 'done') return ApiResponse.error(res, 'This campaign has finished', 400);
  c.status = state;
  c.error = '';
  save(c);
  if (state === 'running') tick().catch(() => {});
  return ApiResponse.success(res, summarize(c), state === 'running' ? 'Calling resumed' : 'Paused: no new calls will start');
};
const deleteCampaign = async (req, res) => {
  const c = recs(req.user.id, 'ai_campaign').find((x) => x.id === req.params.id);
  if (!c) return ApiResponse.error(res, 'Campaign not found', 404);
  if (c.recipients.some((r) => r.status === 'calling')) return ApiResponse.error(res, 'Wait until the calls in progress have finished', 409);
  remove(c.id);
  return ApiResponse.success(res, { id: c.id }, 'Campaign deleted (the call log stays)');
};

/* ---------------- calls API ---------------- */
const listCalls = async (req, res) => {
  const o = String(req.query.outcome || '');
  const q = String(req.query.q || '').toLowerCase();
  const list = recs(req.user.id, 'ai_call')
    .filter((c) => (!o || c.outcome === o || (o === 'calling' && c.status === 'calling')) && (!req.query.lead_id || c.lead_id === req.query.lead_id) && (!q || `${c.company} ${c.name} ${c.to} ${c.summary}`.toLowerCase().includes(q)))
    .sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))
    .slice(0, 300)
    .map(({ transcript, ...rest }) => rest);
  return ApiResponse.success(res, list);
};
const getCall = async (req, res) => {
  const c = recs(req.user.id, 'ai_call').find((x) => x.id === req.params.id);
  return c ? ApiResponse.success(res, c) : ApiResponse.error(res, 'Call not found', 404);
};
/** The recording, streamed from ElevenLabs (the API key never reaches the browser). */
const getAudio = async (req, res) => {
  const c = recs(req.user.id, 'ai_call').find((x) => x.id === req.params.id);
  const s = settingsOf(req.user.id);
  if (!c || !s || !c.conversation_id) return ApiResponse.error(res, 'Recording not found', 404);
  try {
    const r = await el.getAudio(keyOf(s), c.conversation_id);
    res.set({ 'Content-Type': r.headers.get('content-type') || 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' });
    return res.end(Buffer.from(await r.arrayBuffer()));
  } catch (err) {
    return ApiResponse.error(res, 'The recording is not available (yet).', 404);
  }
};

const getDashboard = async (req, res) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const since = Date.now() - days * 24 * HOUR;
  const s = settingsOf(req.user.id) || {};
  const calls = recs(req.user.id, 'ai_call').filter((c) => !c.test && Date.parse(c.started_at) >= since);
  const by = (o) => calls.filter((c) => c.outcome === o).length;
  const answered = calls.filter((c) => c.answered).length;
  const countries = {};
  calls.forEach((c) => {
    const k = c.country || `+${String(c.to).slice(0, 3)}`;
    const row = countries[k] || (countries[k] = { country: k, calls: 0, answered: 0, interested: 0, minutes: 0, cost: 0 });
    row.calls += 1; if (c.answered) row.answered += 1; if (c.outcome === 'interested') row.interested += 1;
    row.minutes += (c.duration_secs || 0) / 60; row.cost += c.cost || 0;
  });
  return ApiResponse.success(res, {
    connected: ready(s), days,
    totals: {
      calls: calls.length, answered, interested: by('interested'), callback: by('callback'), not_interested: by('not_interested'), no_answer: by('no_answer'), do_not_call: by('do_not_call'),
      in_progress: calls.filter((c) => c.status === 'calling').length,
      minutes: Math.round(calls.reduce((a, c) => a + (c.duration_secs || 0), 0) / 6) / 10,
      cost: Math.round(calls.reduce((a, c) => a + (c.cost || 0), 0) * 100) / 100,
      currency: (s.rates || DEFAULT_RATES).currency,
      answer_rate: calls.length ? Math.round((answered / calls.length) * 1000) / 10 : 0,
    },
    countries: Object.values(countries).map((r) => ({ ...r, minutes: Math.round(r.minutes * 10) / 10, cost: Math.round(r.cost * 100) / 100 })).sort((a, b) => b.calls - a.calls),
  });
};

module.exports = {
  requireFeature, getStatus, getSettings, connect, saveOptions, saveScript, testCall,
  listTags, previewAudience, createCampaign, listCampaigns, getCampaign, deleteCampaign,
  pauseCampaign: setCampaignState('paused'), resumeCampaign: setCampaignState('running'),
  listCalls, getCall, getAudio, getDashboard,
  tick, startAiCallScheduler, finalize, outcomeOf, buildPrompt, DATA_COLLECTION,
};
