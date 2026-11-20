/**
 * Social Media (premium, per company): connect Facebook Pages + Instagram accounts, write posts (by hand or
 * with the company's OWN AI key), plan them on a calendar, staff drafts go to the owner for approval, and a
 * scheduler publishes them on time.
 *
 * Records live in the WhatsApp/AI collection (dataStore.waRecords) with kinds:
 *   social_account  one Facebook Page or Instagram account (Page token encrypted)
 *   social_post     a post with one target per account and its result
 *   social_media    a picture (upload or AI), served publicly so Instagram/Facebook can fetch it
 *   social_ai       the company's AI keys (encrypted) and chosen providers / models
 */
const crypto = require('crypto');
const ApiResponse = require('../utils/apiResponse');
const config = require('../config/env');
const { dataStore } = require('../repositories/dataStore');
const { dbSync } = require('../repositories/dataStore');
const { isSuperAdmin, isOwnerUser } = require('../utils/access');
const { ownerOf } = require('../utils/usage');
const mailer = require('../services/mailer.service');
const meta = require('../services/socialGraph.service');
const ai = require('../services/aiProviders.service');

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const nowIso = () => new Date().toISOString();
const newId = (p) => `${p}_${crypto.randomBytes(12).toString('hex')}`;
const MAX_PICTURE = 4 * 1024 * 1024; // uploads (Instagram allows up to 8 MB)
const MAX_AI_PICTURE = 8 * 1024 * 1024;
const LIMITS = { facebook: 5000, instagram: 2200 };
const PLATFORMS = ['facebook', 'instagram'];

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

/* ------------------------------------------------------------------ */
/* Access                                                              */
/* ------------------------------------------------------------------ */

const companyOwner = (user) => (isOwnerUser(user) ? (dataStore.users.find((u) => u.id === user.id) || user) : ownerOf(user));
const featureOn = (owner) => Boolean(owner && owner.features && owner.features.social_media);
const staffAllowed = (user) => {
  const fresh = dataStore.users.find((u) => u.id === user.id) || user;
  return Boolean(fresh.permissions && fresh.permissions.social_media === true);
};

const requireFeature = (req, res, next) => {
  if (isSuperAdmin(req.user)) return res.status(403).json({ success: false, message: 'Social Media is used by company accounts.' });
  const owner = companyOwner(req.user);
  if (!owner || !featureOn(owner)) return res.status(403).json({ success: false, code: 'FEATURE_DISABLED', message: 'Social Media is a premium feature. Ask the platform admin to switch it on for your company.' });
  const isOwner = isOwnerUser(req.user);
  if (!isOwner && !staffAllowed(req.user)) return res.status(403).json({ success: false, code: 'NO_PERMISSION', message: 'Your company owner has not given you access to Social Media.' });
  req.social = { owner: owner.id, ownerName: owner.company_name || owner.name || '', isOwner };
  return next();
};
const ownerOnly = (req, res, next) => (req.social && req.social.isOwner ? next() : res.status(403).json({ success: false, code: 'OWNER_ONLY', message: 'Only the company owner can do this.' }));

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

const aiSettingsOf = (owner) => recs(owner, 'social_ai')[0] || null;
const aiReady = (owner) => {
  const s = aiSettingsOf(owner);
  const has = (p) => Boolean(s && s.providers && s.providers[p] && s.providers[p].key_enc);
  const textP = s && s.text_provider && has(s.text_provider) ? s.text_provider : ['anthropic', 'openai', 'gemini', 'xai'].find(has) || '';
  const imageP = s && s.image_provider && has(s.image_provider) && ai.PROVIDERS[s.image_provider].image ? s.image_provider : ['openai', 'gemini', 'xai'].find(has) || '';
  return { text: textP, image: imageP };
};

const accountView = (a) => ({ id: a.id, platform: a.platform, name: a.name, username: a.username || '', picture: a.picture || '', page_name: a.page_name || '', connected_at: a.connected_at, status: a.status || 'ok', error: a.error || '' });

const getStatus = async (req, res) => {
  const owner = companyOwner(req.user);
  const enabled = featureOn(owner);
  const isOwner = isOwnerUser(req.user);
  const canUse = enabled && (isOwner || staffAllowed(req.user));
  if (!canUse) return ApiResponse.success(res, { enabled, is_owner: isOwner, can_use: false });
  const r = aiReady(owner.id);
  return ApiResponse.success(res, {
    enabled, is_owner: isOwner, can_use: true, meta_ready: meta.ready(),
    accounts: recs(owner.id, 'social_account').map(accountView),
    ai: { text: r.text, image: r.image },
    pending_approval: recs(owner.id, 'social_post').filter((p) => p.status === 'pending_approval').length,
  });
};

/* ------------------------------------------------------------------ */
/* Connect Facebook / Instagram (Meta login)                           */
/* ------------------------------------------------------------------ */

const redirectUri = () => `${config.apiPublicUrl}/api/v1/social/oauth/callback`;
const sign = (payload) => crypto.createHmac('sha256', config.jwtSecret).update(payload).digest('base64url');
const makeState = (owner, by) => {
  const payload = Buffer.from(JSON.stringify({ o: owner, b: by, t: Date.now(), n: crypto.randomBytes(6).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload)}`;
};
const readState = (state) => {
  const [payload, mac] = String(state || '').split('.');
  if (!payload || !mac) return null;
  const good = sign(payload);
  if (mac.length !== good.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return Date.now() - s.t < 20 * 60 * 1000 ? s : null;
  } catch { return null; }
};

const startConnect = async (req, res) => {
  if (!meta.ready()) return ApiResponse.error(res, 'Facebook / Instagram connection is not set up on the server yet. Ask the platform admin.', 400);
  return ApiResponse.success(res, { url: meta.loginUrl(redirectUri(), makeState(req.social.owner, req.user.id)) });
};

const back = (res, params) => res.redirect(302, `${config.appUrl}/?${new URLSearchParams({ tab: 'social', ...params }).toString()}`);

/** Public: Facebook sends the owner back here after "Allow". */
const oauthCallback = async (req, res) => {
  const st = readState(req.query.state);
  if (!st) return back(res, { social: 'error', msg: 'The connection link expired. Please press Connect again.' });
  if (req.query.error || !req.query.code) return back(res, { social: 'error', msg: str(req.query.error_description || req.query.error_reason || 'Facebook login was cancelled.', 200) });
  const owner = dataStore.users.find((u) => u.id === st.o);
  if (!owner || !featureOn(owner)) return back(res, { social: 'error', msg: 'Social Media is not switched on for this company.' });
  try {
    const { pages } = await meta.exchangeAndList(String(req.query.code), redirectUri());
    const existing = recs(owner.id, 'social_account');
    let count = 0;
    const upsert = (platform, extId, fields) => {
      const prev = existing.find((a) => a.platform === platform && a.ext_id === extId);
      save({ ...(prev || { id: newId('sac'), kind: 'social_account', owner_id: owner.id, platform, ext_id: extId, created_at: nowIso() }), ...fields, status: 'ok', error: '', connected_at: nowIso(), connected_by: st.b });
      count += 1;
    };
    for (const p of pages) {
      if (!p.id || !p.access_token) continue;
      const tokenEnc = mailer.encryptSecret(p.access_token);
      upsert('facebook', String(p.id), { name: str(p.name, 120), picture: (p.picture && p.picture.data && p.picture.data.url) || '', token_enc: tokenEnc });
      const ig = p.instagram_business_account;
      if (ig && ig.id) upsert('instagram', String(ig.id), { name: ig.username ? `@${ig.username}` : str(p.name, 120), username: ig.username || '', picture: ig.profile_picture_url || '', page_id: String(p.id), page_name: str(p.name, 120), token_enc: tokenEnc });
    }
    if (!count) return back(res, { social: 'error', msg: 'No Facebook Page was shared. Connect again and tick your Page (and its Instagram account).' });
    return back(res, { social: 'connected', n: String(count) });
  } catch (err) {
    return back(res, { social: 'error', msg: str(err.message, 200) });
  }
};

const listAccounts = async (req, res) => ApiResponse.success(res, recs(req.social.owner, 'social_account').map(accountView));

const disconnectAccount = async (req, res) => {
  const a = recs(req.social.owner, 'social_account').find((x) => x.id === req.params.id);
  if (!a) return ApiResponse.error(res, 'Account not found', 404);
  remove(a.id);
  return ApiResponse.success(res, { id: a.id }, `${a.name} removed from the CRM. (To remove the CRM's access completely, also remove it in Facebook → Settings → Business integrations.)`);
};

/* ------------------------------------------------------------------ */
/* AI settings (the company's own keys)                                */
/* ------------------------------------------------------------------ */

const aiView = (owner) => {
  const s = aiSettingsOf(owner) || { providers: {} };
  const r = aiReady(owner);
  return {
    providers: Object.fromEntries(Object.entries(ai.PROVIDERS).map(([k, p]) => {
      const mine = (s.providers || {})[k] || {};
      return [k, { label: p.label, text: p.text, image: p.image, key_hint: p.keyHint, key_url: p.keyUrl, has_key: Boolean(mine.key_enc), key_last4: mine.key_last4 || '', text_model: mine.text_model || p.text_model, image_model: p.image ? (mine.image_model || p.image_model) : '', default_text_model: p.text_model, default_image_model: p.image_model }];
    })),
    text_provider: r.text, image_provider: r.image,
  };
};

const getAiSettings = async (req, res) => ApiResponse.success(res, aiView(req.social.owner));

const saveAiSettings = async (req, res) => {
  const owner = req.social.owner;
  const s = aiSettingsOf(owner) || { id: newId('sai'), kind: 'social_ai', owner_id: owner, providers: {}, created_at: nowIso() };
  const body = req.body || {};
  for (const k of Object.keys(ai.PROVIDERS)) {
    const inp = (body.providers || {})[k];
    if (!inp) continue;
    const cur = { ...(s.providers[k] || {}) };
    if (inp.remove) { delete s.providers[k]; continue; }
    const key = str(inp.api_key, 300);
    if (key) { cur.key_enc = mailer.encryptSecret(key); cur.key_last4 = key.slice(-4); }
    if (inp.text_model !== undefined) cur.text_model = str(inp.text_model, 80);
    if (inp.image_model !== undefined && ai.PROVIDERS[k].image) cur.image_model = str(inp.image_model, 80);
    s.providers[k] = cur;
  }
  if (body.text_provider !== undefined) s.text_provider = ai.PROVIDERS[body.text_provider] ? body.text_provider : '';
  if (body.image_provider !== undefined) s.image_provider = ai.PROVIDERS[body.image_provider] && ai.PROVIDERS[body.image_provider].image ? body.image_provider : '';
  s.updated_at = nowIso();
  save(s);
  return ApiResponse.success(res, aiView(owner), 'AI settings saved');
};

const keyOf = (owner, provider) => {
  const s = aiSettingsOf(owner);
  const p = s && s.providers && s.providers[provider];
  if (!p || !p.key_enc) return null;
  return { key: mailer.decryptSecret(p.key_enc), text_model: p.text_model, image_model: p.image_model };
};

const testAi = async (req, res) => {
  const provider = String((req.body && req.body.provider) || '');
  if (!ai.PROVIDERS[provider]) return ApiResponse.error(res, 'Unknown AI provider', 400);
  const k = keyOf(req.social.owner, provider);
  if (!k) return ApiResponse.error(res, 'Save the API key first', 400);
  try {
    const out = await ai.testKey(provider, k.key, k.text_model);
    return ApiResponse.success(res, { reply: out }, `${ai.PROVIDERS[provider].label} works`);
  } catch (err) { return ApiResponse.error(res, err.message, 400); }
};

const parseJson = (text) => {
  const t = String(text || '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
};

const writeWithAi = async (req, res) => {
  const owner = req.social.owner;
  const provider = (req.body && ai.PROVIDERS[req.body.provider] && req.body.provider) || aiReady(owner).text;
  const k = provider ? keyOf(owner, provider) : null;
  if (!k) return ApiResponse.error(res, 'Add your AI key first (Social Media → AI settings). The CRM uses your own OpenAI, Gemini, Claude or Grok account.', 400);
  const b = req.body || {};
  const topic = str(b.topic, 1500);
  if (!topic) return ApiResponse.error(res, 'Write what the post is about', 400);
  const platforms = (Array.isArray(b.platforms) ? b.platforms : PLATFORMS).filter((p) => PLATFORMS.includes(p));
  const system = [
    `You write social media posts for "${req.social.ownerName || 'an export-import company'}", a B2B export / import business. Buyers are importers, distributors and traders in many countries.`,
    'Write clear, honest, professional posts. Never invent prices, certificates, awards or numbers that are not in the brief.',
    'Facebook: 2-5 short paragraphs, can include a call to action. Instagram: a short catchy first line, short lines, emojis allowed, 5-12 relevant hashtags at the end.',
    'Return ONLY a JSON object, no other text: {"facebook": "...", "instagram": "...", "image_idea": "one sentence describing a good picture for this post"}. Leave out platforms that were not asked for.',
  ].join('\n');
  const prompt = [
    `Platforms: ${platforms.join(', ')}`,
    `What the post is about: ${topic}`,
    b.details ? `Facts to use: ${str(b.details, 2000)}` : '',
    `Tone: ${str(b.tone, 40) || 'professional and friendly'}`,
    `Language: ${str(b.language, 40) || 'English'}`,
    b.cta ? `Call to action: ${str(b.cta, 200)}` : '',
  ].filter(Boolean).join('\n');
  try {
    const out = await ai.generateText(provider, k.key, k.text_model, system, prompt);
    const j = parseJson(out);
    const texts = {};
    platforms.forEach((p) => { if (j && typeof j[p] === 'string') texts[p] = j[p].slice(0, LIMITS[p]); });
    if (!Object.keys(texts).length) {
      const plain = String(out || '').trim();
      if (!plain) return ApiResponse.error(res, 'The AI did not return a post. Try again.', 502);
      platforms.forEach((p) => { texts[p] = plain.slice(0, LIMITS[p]); });
    }
    return ApiResponse.success(res, { provider, texts, image_idea: j && typeof j.image_idea === 'string' ? j.image_idea.slice(0, 400) : '' });
  } catch (err) { return ApiResponse.error(res, err.message, 400); }
};

const ideasWithAi = async (req, res) => {
  const owner = req.social.owner;
  const provider = aiReady(owner).text;
  const k = provider ? keyOf(owner, provider) : null;
  if (!k) return ApiResponse.error(res, 'Add your AI key first (Social Media → AI settings).', 400);
  const b = req.body || {};
  const month = str(b.month, 7) || nowIso().slice(0, 7);
  const count = Math.min(20, Math.max(4, Number(b.count) || 12));
  const system = [
    `You plan a month of social media posts for "${req.social.ownerName || 'an export-import company'}", a B2B export / import business.`,
    'Mix: product highlights, quality / process, shipments and logistics, trade fairs, market news, festivals of buyer countries, customer trust. Never invent facts.',
    'Return ONLY JSON: {"ideas": [{"date": "YYYY-MM-DD", "title": "short title", "brief": "one or two sentences: what to post", "platforms": ["facebook","instagram"]}]}',
  ].join('\n');
  const prompt = `Month: ${month}\nNumber of posts: ${count}\nProducts / focus: ${str(b.focus, 1000) || 'our main export products'}\nBuyer countries: ${str(b.countries, 300) || 'worldwide'}`;
  try {
    const j = parseJson(await ai.generateText(provider, k.key, k.text_model, system, prompt));
    const ideas = (j && Array.isArray(j.ideas) ? j.ideas : []).slice(0, count).map((x) => ({
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) ? x.date : '',
      title: str(x.title, 120), brief: str(x.brief, 600),
      platforms: (Array.isArray(x.platforms) ? x.platforms : PLATFORMS).filter((p) => PLATFORMS.includes(p)),
    })).filter((x) => x.title);
    if (!ideas.length) return ApiResponse.error(res, 'The AI did not return a plan. Try again.', 502);
    return ApiResponse.success(res, { provider, ideas });
  } catch (err) { return ApiResponse.error(res, err.message, 400); }
};

/* ------------------------------------------------------------------ */
/* Pictures                                                            */
/* ------------------------------------------------------------------ */

const mediaUrl = (id) => `${config.apiPublicUrl}/api/v1/social/media/${id}`;
const saveMedia = (owner, by, mime, buf, source) => save({ id: newId('smd'), kind: 'social_media', owner_id: owner, created_by: by, mime, size: buf.length, data: buf.toString('base64'), source, created_at: nowIso() });

const uploadMedia = async (req, res) => {
  const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String((req.body && req.body.data_url) || ''));
  if (!m) return ApiResponse.error(res, 'Only JPG or PNG pictures can be used', 400);
  const buf = Buffer.from(m[2], 'base64');
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isJpg && !isPng) return ApiResponse.error(res, 'The file is not a real JPG or PNG picture', 400);
  if (buf.length > MAX_PICTURE) return ApiResponse.error(res, 'The picture is larger than 4 MB. Please use a smaller one.', 413);
  const rec = saveMedia(req.social.owner, req.user.id, isPng ? 'image/png' : 'image/jpeg', buf, 'upload');
  return ApiResponse.success(res, { id: rec.id, url: mediaUrl(rec.id) }, 'Picture uploaded', 201);
};

const imageWithAi = async (req, res) => {
  const owner = req.social.owner;
  const provider = (req.body && ai.PROVIDERS[req.body.provider] && ai.PROVIDERS[req.body.provider].image && req.body.provider) || aiReady(owner).image;
  const k = provider ? keyOf(owner, provider) : null;
  if (!k) return ApiResponse.error(res, 'Add an OpenAI, Gemini or xAI key to make pictures (Social Media → AI settings).', 400);
  const prompt = str(req.body && req.body.prompt, 1500);
  if (!prompt) return ApiResponse.error(res, 'Describe the picture', 400);
  try {
    const img = await ai.generateImage(provider, k.key, k.image_model, `${prompt}\nStyle: clean, professional photo or graphic for a B2B export company's social media post. No misspelled text.`);
    const buf = Buffer.from(img.data, 'base64');
    if (buf.length > MAX_AI_PICTURE) return ApiResponse.error(res, 'The picture from the AI is too large.', 413);
    const mime = /png/.test(img.mime) ? 'image/png' : 'image/jpeg';
    const rec = saveMedia(owner, req.user.id, mime, buf, `ai:${provider}`);
    return ApiResponse.success(res, { id: rec.id, url: mediaUrl(rec.id), provider }, 'Picture made', 201);
  } catch (err) { return ApiResponse.error(res, err.message, 400); }
};

/** Public: Facebook / Instagram download the picture from here when posting. */
const getMedia = async (req, res) => {
  const rec = all().find((r) => r.kind === 'social_media' && r.id === req.params.id);
  if (!rec) return res.status(404).end();
  res.set({ 'Content-Type': rec.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
  return res.end(Buffer.from(rec.data, 'base64'));
};

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

const postView = (p) => ({
  id: p.id, status: p.status, text: p.text, texts: p.texts || {}, media_ids: p.media_ids || [],
  media: (p.media_ids || []).map((id) => ({ id, url: mediaUrl(id) })),
  account_ids: p.account_ids || [], scheduled_at: p.scheduled_at || null, posted_at: p.posted_at || null,
  targets: p.targets || [], created_by: p.created_by, created_by_name: p.created_by_name || '', approved_by_name: p.approved_by_name || '',
  note: p.note || '', created_at: p.created_at, updated_at: p.updated_at, error: p.error || '',
});

const listPosts = async (req, res) => {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from)) ? req.query.from : null;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to)) ? req.query.to : null;
  const day = (p) => String(p.scheduled_at || p.posted_at || p.created_at || '').slice(0, 10);
  const list = recs(req.social.owner, 'social_post')
    .filter((p) => (!from || day(p) >= from) && (!to || day(p) <= to))
    .sort((a, b) => String(a.scheduled_at || a.created_at).localeCompare(String(b.scheduled_at || b.created_at)));
  return ApiResponse.success(res, list.map(postView));
};

/** Checks a post before it may be scheduled or published. Returns an error text or ''. */
const problemsOf = (owner, p) => {
  const accounts = recs(owner, 'social_account');
  const picked = (p.account_ids || []).map((id) => accounts.find((a) => a.id === id)).filter(Boolean);
  if (!picked.length) return 'Choose at least one Facebook Page or Instagram account';
  for (const a of picked) {
    const text = (p.texts && p.texts[a.platform]) || p.text || '';
    if (text.length > LIMITS[a.platform]) return `The ${a.platform} text is longer than ${LIMITS[a.platform]} characters`;
    if (a.platform === 'instagram' && !(p.media_ids || []).length) return 'Instagram needs a picture. Add a photo (upload or AI).';
    if (a.platform === 'facebook' && !text.trim() && !(p.media_ids || []).length) return 'Write some text or add a picture';
  }
  return '';
};

const readBody = (owner, b, prev) => {
  const accounts = recs(owner, 'social_account');
  const media = new Set(recs(owner, 'social_media').map((m) => m.id));
  const texts = {};
  PLATFORMS.forEach((pl) => { const t = b.texts && typeof b.texts[pl] === 'string' ? b.texts[pl].slice(0, LIMITS[pl] + 50) : ''; if (t.trim()) texts[pl] = t; });
  let scheduled = null;
  if (b.scheduled_at) {
    const t = Date.parse(b.scheduled_at);
    if (Number.isNaN(t)) throw new Error('The date / time is not valid');
    scheduled = new Date(t).toISOString();
  }
  return {
    text: typeof b.text === 'string' ? b.text.slice(0, 5050) : (prev ? prev.text : ''),
    texts: b.texts !== undefined ? texts : (prev ? prev.texts : {}),
    media_ids: Array.isArray(b.media_ids) ? b.media_ids.filter((id) => media.has(id)).slice(0, 1) : (prev ? prev.media_ids : []),
    account_ids: Array.isArray(b.account_ids) ? b.account_ids.filter((id) => accounts.some((a) => a.id === id)) : (prev ? prev.account_ids : []),
    scheduled_at: b.scheduled_at !== undefined ? scheduled : (prev ? prev.scheduled_at : null),
    note: typeof b.note === 'string' ? b.note.slice(0, 300) : (prev ? prev.note : ''),
  };
};

/** action: draft | schedule | now. Staff "schedule"/"now" goes to the owner for approval. */
const applyAction = (req, post, action) => {
  const owner = req.social.owner;
  if (action === 'draft') { post.status = 'draft'; return ''; }
  const problem = problemsOf(owner, post);
  if (problem) return problem;
  if (action === 'schedule') {
    if (!post.scheduled_at) return 'Choose the date and time';
    if (Date.parse(post.scheduled_at) < Date.now() - 60000) return 'The time is in the past. Choose a later time or press Post now.';
  }
  if (!req.social.isOwner) { post.status = 'pending_approval'; post.wants_now = action === 'now'; return ''; }
  if (action === 'now') { post.scheduled_at = nowIso(); post.status = 'scheduled'; post.publish_now = true; return ''; }
  post.status = 'scheduled';
  return '';
};

const createPost = async (req, res) => {
  const owner = req.social.owner;
  let fields;
  try { fields = readBody(owner, req.body || {}, null); } catch (err) { return ApiResponse.error(res, err.message, 400); }
  const post = { id: newId('spo'), kind: 'social_post', owner_id: owner, ...fields, status: 'draft', targets: [], created_by: req.user.id, created_by_name: req.user.name || '', created_at: nowIso(), updated_at: nowIso() };
  const problem = applyAction(req, post, String((req.body && req.body.action) || 'draft'));
  if (problem) return ApiResponse.error(res, problem, 400);
  save(post);
  const message = post.status === 'pending_approval' ? 'Sent to the owner for approval' : post.publish_now ? 'Posting now…' : post.status === 'scheduled' ? 'Scheduled' : 'Draft saved';
  const view = postView(post);
  if (post.publish_now) runPost(post).catch(() => {});
  return ApiResponse.success(res, view, message, 201);
};

const findPost = (req) => recs(req.social.owner, 'social_post').find((p) => p.id === req.params.id);
const canEdit = (req, p) => (req.social.isOwner ? ['draft', 'pending_approval', 'scheduled', 'failed'].includes(p.status) : p.created_by === req.user.id && ['draft', 'pending_approval', 'failed'].includes(p.status));

const updatePost = async (req, res) => {
  const p = findPost(req);
  if (!p) return ApiResponse.error(res, 'Post not found', 404);
  if (!canEdit(req, p)) return ApiResponse.error(res, p.status === 'posted' ? 'This post is already published' : 'You cannot change this post', 403);
  let fields;
  try { fields = readBody(req.social.owner, req.body || {}, p); } catch (err) { return ApiResponse.error(res, err.message, 400); }
  const next = { ...p, ...fields, updated_at: nowIso() };
  const action = req.body && req.body.action ? String(req.body.action) : (p.status === 'scheduled' ? 'schedule' : p.status === 'pending_approval' ? 'schedule' : 'draft');
  const problem = applyAction(req, next, action === 'keep' ? (p.status === 'scheduled' ? 'schedule' : 'draft') : action);
  if (problem) return ApiResponse.error(res, problem, 400);
  save(next);
  const message = next.status === 'pending_approval' ? 'Sent to the owner for approval' : next.publish_now ? 'Posting now…' : next.status === 'scheduled' ? 'Scheduled' : 'Saved';
  const view = postView(next);
  if (next.publish_now) runPost(next).catch(() => {});
  return ApiResponse.success(res, view, message);
};

const deletePost = async (req, res) => {
  const p = findPost(req);
  if (!p) return ApiResponse.error(res, 'Post not found', 404);
  if (!req.social.isOwner && p.created_by !== req.user.id) return ApiResponse.error(res, 'You can delete only your own posts', 403);
  if (p.status === 'publishing') return ApiResponse.error(res, 'The post is being published right now', 409);
  remove(p.id);
  return ApiResponse.success(res, { id: p.id }, p.status === 'posted' ? 'Removed from the calendar (it stays on Facebook / Instagram)' : 'Post deleted');
};

const approvePost = async (req, res) => {
  const p = findPost(req);
  if (!p) return ApiResponse.error(res, 'Post not found', 404);
  if (p.status !== 'pending_approval') return ApiResponse.error(res, 'This post is not waiting for approval', 400);
  const problem = problemsOf(req.social.owner, p);
  if (problem) return ApiResponse.error(res, problem, 400);
  const now = p.wants_now || !p.scheduled_at || Date.parse(p.scheduled_at) <= Date.now();
  Object.assign(p, { status: 'scheduled', scheduled_at: now ? nowIso() : p.scheduled_at, approved_by: req.user.id, approved_by_name: req.user.name || '', approved_at: nowIso(), updated_at: nowIso() });
  save(p);
  if (now) runPost(p).catch(() => {});
  return ApiResponse.success(res, postView(p), now ? 'Approved – posting now' : 'Approved and scheduled');
};

const rejectPost = async (req, res) => {
  const p = findPost(req);
  if (!p) return ApiResponse.error(res, 'Post not found', 404);
  if (p.status !== 'pending_approval') return ApiResponse.error(res, 'This post is not waiting for approval', 400);
  Object.assign(p, { status: 'draft', note: str(req.body && req.body.note, 300) || 'Sent back by the owner', updated_at: nowIso() });
  save(p);
  return ApiResponse.success(res, postView(p), 'Sent back as a draft');
};

const retryPost = async (req, res) => {
  const p = findPost(req);
  if (!p) return ApiResponse.error(res, 'Post not found', 404);
  if (!['failed', 'partial'].includes(p.status)) return ApiResponse.error(res, 'Only a failed post can be tried again', 400);
  Object.assign(p, { status: 'scheduled', scheduled_at: nowIso(), error: '', updated_at: nowIso() });
  save(p);
  runPost(p).catch(() => {});
  return ApiResponse.success(res, postView(p), 'Trying again…');
};

/* ------------------------------------------------------------------ */
/* Publishing + scheduler                                              */
/* ------------------------------------------------------------------ */

const running = new Set();
async function runPost(post) {
  if (running.has(post.id)) return;
  running.add(post.id);
  try {
    const accounts = recs(post.owner_id, 'social_account');
    const picture = (post.media_ids || [])[0] ? mediaUrl(post.media_ids[0]) : '';
    post.status = 'publishing';
    post.publish_now = false;
    post.targets = (post.account_ids || []).map((id) => (post.targets || []).find((t) => t.account_id === id) || { account_id: id, status: 'pending' });
    save(post);
    for (const t of post.targets) {
      if (t.status === 'posted') continue;
      const a = accounts.find((x) => x.id === t.account_id);
      if (!a) { Object.assign(t, { status: 'failed', error: 'This account was removed from the CRM' }); continue; }
      Object.assign(t, { platform: a.platform, name: a.name });
      const text = (post.texts && post.texts[a.platform]) || post.text || '';
      try {
        const token = mailer.decryptSecret(a.token_enc);
        const r = a.platform === 'facebook'
          ? await meta.publishFacebook(a.ext_id, token, { message: text, imageUrl: picture })
          : await meta.publishInstagram(a.ext_id, token, { caption: text, imageUrl: picture }, process.env.NODE_ENV === 'test' ? { waitMs: 10, tries: 3 } : undefined);
        Object.assign(t, { status: 'posted', ext_id: r.id, permalink: r.permalink, posted_at: nowIso(), error: '' });
      } catch (err) {
        const expired = err.code === 190;
        Object.assign(t, { status: 'failed', error: expired ? 'Facebook login expired. Connect the account again (Social Media → Accounts).' : str(err.message, 300) });
        if (expired) { a.status = 'expired'; a.error = t.error; save(a); }
      }
      save(post);
    }
    const ok = post.targets.filter((t) => t.status === 'posted').length;
    post.status = ok === post.targets.length ? 'posted' : ok ? 'partial' : 'failed';
    post.posted_at = ok ? nowIso() : post.posted_at || null;
    post.error = post.status === 'posted' ? '' : post.targets.filter((t) => t.status === 'failed').map((t) => `${t.name || t.platform}: ${t.error}`).join(' | ').slice(0, 500);
    post.updated_at = nowIso();
    save(post);
    if (post.status !== 'posted') notifyFailure(post);
  } finally {
    running.delete(post.id);
  }
}

const notifyFailure = (post) => {
  try {
    const list = dataStore.notifications || (dataStore.notifications = []);
    const n = {
      id: newId('ntf'), target_user_id: post.owner_id, owner_id: post.owner_id,
      title: 'A social media post was not published', message: post.error || 'Open Social Media to see why.',
      type: 'warning', priority: 'normal', kind: 'social_post', post_id: post.id,
      created_at: nowIso(), created_by: 'Social Media', read_by: [],
    };
    list.unshift(n);
    dbSync.saveNotification(n);
  } catch { /* a bell note is optional */ }
};

let queue = Promise.resolve();
const tick = () => {
  queue = queue.then(async () => {
    const due = all().filter((r) => r.kind === 'social_post' && r.status === 'scheduled' && r.scheduled_at && Date.parse(r.scheduled_at) <= Date.now());
    for (const p of due) await runPost(p);
  }).catch((e) => console.warn('[Social scheduler]', e.message));
  return queue;
};
let timer = null;
const startSocialScheduler = () => {
  if (timer) return;
  timer = setInterval(tick, Number(process.env.SOCIAL_TICK_MS) || 30000);
  if (timer.unref) timer.unref();
};

module.exports = {
  requireFeature, ownerOnly, getStatus,
  startConnect, oauthCallback, listAccounts, disconnectAccount,
  getAiSettings, saveAiSettings, testAi, writeWithAi, ideasWithAi, imageWithAi,
  uploadMedia, getMedia,
  listPosts, createPost, updatePost, deletePost, approvePost, rejectPost, retryPost,
  tick, startSocialScheduler, readState, makeState,
};
