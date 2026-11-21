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
const { dbSync, generateId } = require('../repositories/dataStore');
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
    brand_saved: Boolean(brandOf(owner.id)),
    new_comments: recs(owner.id, 'social_comment').filter((c) => c.status === 'new').length,
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
  if (!str(b.topic, 1500)) return ApiResponse.error(res, 'Write what the post is about', 400);
  try {
    const r = await writePost(owner, req.social.ownerName, provider, k, b);
    return ApiResponse.success(res, { provider, ...r });
  } catch (err) { return ApiResponse.error(res, err.message, err.status === 502 ? 502 : 400); }
};

/** What the AI knows about the company (Brand Profile), as a few lines for every prompt. */
const brandOf = (owner) => recs(owner, 'social_brand')[0] || null;
const brandContext = (owner, ownerName) => {
  const b = brandOf(owner);
  if (!b) return `Company: "${ownerName || 'an export-import company'}", a B2B export / import business.`;
  return [
    `Company: ${b.company || ownerName}${b.website ? ` (${b.website})` : ''}. ${b.about || ''}`,
    b.products ? `Products: ${b.products}` : '', b.certifications ? `Certificates / registrations: ${b.certifications}` : '',
    b.countries ? `Target buyer countries: ${b.countries}` : '', b.buyers ? `Buyers: ${b.buyers}` : '',
    b.usp ? `What makes us different: ${b.usp}` : '', b.goal ? `Goal of social media: ${b.goal}` : '',
    b.cta ? `Usual call to action: ${b.cta}` : '', b.avoid ? `Never say / avoid: ${b.avoid}` : '',
  ].filter(Boolean).join('\n');
};

/** One post for each platform, written with the company's own AI key and the Brand Profile. */
async function writePost(owner, ownerName, provider, k, b) {
  const brand = brandOf(owner) || {};
  const platforms = (Array.isArray(b.platforms) && b.platforms.length ? b.platforms : PLATFORMS).filter((p) => PLATFORMS.includes(p));
  const system = [
    'You write social media posts for this B2B export / import business. Buyers are importers, distributors and traders in many countries.',
    brandContext(owner, ownerName),
    'Write clear, honest, professional posts. Never invent prices, certificates, awards or numbers that are not in the brief or the company facts.',
    'Facebook: 2-5 short paragraphs, can include a call to action. Instagram: a short catchy first line, short lines, emojis allowed, 5-12 relevant hashtags at the end.',
    'Return ONLY a JSON object, no other text: {"facebook": "...", "instagram": "...", "image_idea": "one sentence describing a good picture for this post"}. Leave out platforms that were not asked for.',
  ].join('\n');
  const prompt = [
    `Platforms: ${platforms.join(', ')}`,
    `What the post is about: ${str(b.topic, 1500)}`,
    b.pillar ? `Content pillar: ${str(b.pillar, 80)}` : '', b.format ? `Format: ${str(b.format, 40)}` : '',
    b.details ? `Facts to use: ${str(b.details, 2000)}` : '',
    `Tone: ${str(b.tone, 40) || brand.tone || 'professional and friendly'}`,
    `Language: ${str(b.language, 40) || brand.language || 'English'}`,
    b.cta || brand.cta ? `Call to action: ${str(b.cta, 200) || brand.cta}` : '',
  ].filter(Boolean).join('\n');
  const out = await ai.generateText(provider, k.key, k.text_model, system, prompt);
  const j = parseJson(out);
  const texts = {};
  platforms.forEach((p) => { if (j && typeof j[p] === 'string') texts[p] = j[p].slice(0, LIMITS[p]); });
  if (!Object.keys(texts).length) {
    const plain = String(out || '').trim();
    if (!plain) { const e = new Error('The AI did not return a post. Try again.'); e.status = 502; throw e; }
    platforms.forEach((p) => { texts[p] = plain.slice(0, LIMITS[p]); });
  }
  return { texts, image_idea: j && typeof j.image_idea === 'string' ? j.image_idea.slice(0, 400) : '' };
}

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
  plan_id: p.plan_id || null, pillar: p.pillar || '', image_idea: p.image_idea || '',
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
        if (a.status === 'expired') { a.status = 'ok'; a.error = ''; save(a); } // the login works again
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

/* ------------------------------------------------------------------ */
/* AI Social Media Manager: Brand Profile -> strategy + month plan     */
/* -> every post written from the plan -> scheduled (Part 1)           */
/* ------------------------------------------------------------------ */

const BRAND_FIELDS = { company: 150, website: 200, about: 1500, products: 1500, certifications: 500, countries: 500, buyers: 500, usp: 1000, competitors: 500, tone: 80, language: 60, goal: 300, cta: 200, avoid: 500, photos: 500 };
const brandView = (b) => Object.fromEntries(Object.keys(BRAND_FIELDS).map((k) => [k, (b && b[k]) || ''])) ;

const getBrand = async (req, res) => {
  const b = brandOf(req.social.owner);
  return ApiResponse.success(res, { ...brandView(b), saved: Boolean(b), updated_at: b ? b.updated_at : null });
};

const saveBrand = async (req, res) => {
  const owner = req.social.owner;
  const prev = brandOf(owner) || { id: newId('sbr'), kind: 'social_brand', owner_id: owner, created_at: nowIso() };
  const body = req.body || {};
  const next = { ...prev, ...Object.fromEntries(Object.entries(BRAND_FIELDS).map(([k, max]) => [k, str(body[k], max)])), updated_at: nowIso(), updated_by: req.user.id };
  if (!next.company || !next.products) return ApiResponse.error(res, 'Write at least the company name and the products', 400);
  save(next);
  return ApiResponse.success(res, { ...brandView(next), saved: true, updated_at: next.updated_at }, 'Brand profile saved. The AI now writes every post with it.');
};

/** What the CRM already knows: company name, commodity list, top products and buyer countries of the leads. */
const crmFacts = (owner, ownerName) => {
  const leads = (dataStore.leads || []).filter((l) => l.owner_id === owner);
  const count = (vals) => Object.entries(vals.reduce((m, v) => { const k = String(v || '').trim(); if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
  const opts = (dataStore.appSettings || []).find((s) => s.id === `lead_options:${owner}`) || {};
  return {
    company: ownerName,
    products: count([...leads.flatMap((l) => (Array.isArray(l.products) ? l.products : String(l.product || '').split(','))), ...((opts.commodities) || [])]),
    countries: count(leads.map((l) => l.country)),
    leads: leads.length,
  };
};

const draftBrand = async (req, res) => {
  const owner = req.social.owner;
  const provider = aiReady(owner).text;
  const k = provider ? keyOf(owner, provider) : null;
  if (!k) return ApiResponse.error(res, 'Add your AI key first (Social Media → AI settings).', 400);
  const facts = crmFacts(owner, req.social.ownerName);
  const system = [
    'You prepare the brand profile that guides the social media of a B2B export / import company.',
    'Use ONLY the facts given and the owner\'s own words. Leave a field empty when you do not know it. Never invent certificates, numbers or awards.',
    'Return ONLY JSON with these string fields: {"company","website","about","products","certifications","countries","buyers","usp","competitors","tone","language","goal","cta","avoid","photos"}.',
    '"about": 2-3 sentences. "products": short list with key specs if known. "tone": e.g. "professional and friendly". "goal": e.g. "get enquiries from importers". "photos": which photos the company should take (product, packing, loading).',
  ].join('\n');
  const prompt = [
    `Company name in the CRM: ${facts.company}`,
    facts.products.length ? `Products in the CRM: ${facts.products.join(', ')}` : '',
    facts.countries.length ? `Countries of their buyers (leads): ${facts.countries.join(', ')}` : '',
    `Owner's description: ${str(req.body && req.body.description, 3000) || '(none)'}`,
  ].filter(Boolean).join('\n');
  try {
    const j = parseJson(await ai.generateText(provider, k.key, k.text_model, system, prompt));
    if (!j) return ApiResponse.error(res, 'The AI did not return a profile. Try again.', 502);
    return ApiResponse.success(res, { ...brandView(Object.fromEntries(Object.entries(BRAND_FIELDS).map(([f, max]) => [f, str(String(j[f] ?? ''), max)]))), saved: false, provider }, 'Draft ready. Check it, correct anything, then press Save.');
  } catch (err) { return ApiResponse.error(res, err.message, 400); }
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const plansOf = (owner) => recs(owner, 'social_plan');
const planView = (p) => {
  const posts = recs(p.owner_id, 'social_post').filter((x) => x.plan_id === p.id);
  return {
    id: p.id, month: p.month, status: p.status, summary: p.summary || '', pillars: p.pillars || [], best_times: p.best_times || [],
    settings: p.settings || {}, created_at: p.created_at, job: p.job || null, learned_from_results: Boolean(p.learned_from_results),
    items: (p.items || []).map((it) => { const post = posts.find((x) => x.id === it.post_id); return { ...it, post_status: post ? post.status : null }; }),
  };
};

const getPlan = async (req, res) => {
  const month = MONTH.test(String(req.query.month)) ? req.query.month : nowIso().slice(0, 7);
  const p = plansOf(req.social.owner).filter((x) => x.month === month).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
  return ApiResponse.success(res, p ? planView(p) : null);
};

const makePlan = async (req, res) => {
  const owner = req.social.owner;
  const provider = aiReady(owner).text;
  const k = provider ? keyOf(owner, provider) : null;
  if (!k) return ApiResponse.error(res, 'Add your AI key first (Social Media → AI settings).', 400);
  if (!brandOf(owner)) return ApiResponse.error(res, 'Fill in the Brand Profile first (step 1), so the AI knows your business.', 400);
  const b = req.body || {};
  const month = MONTH.test(String(b.month)) ? b.month : nowIso().slice(0, 7);
  const perWeek = Math.min(14, Math.max(1, Math.round(Number(b.posts_per_week) || 3)));
  const connected = [...new Set(recs(owner, 'social_account').map((a) => a.platform))];
  const platforms = (Array.isArray(b.platforms) && b.platforms.length ? b.platforms : (connected.length ? connected : PLATFORMS)).filter((p) => PLATFORMS.includes(p));
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = nowIso().slice(0, 10);
  const firstDay = `${month}-01` < today && today.slice(0, 7) === month ? today : `${month}-01`;
  const learned = learningsFor(owner, month);
  const system = [
    'You are the social media manager of this B2B export / import company. Plan one month of posts.',
    brandContext(owner, req.social.ownerName),
    'First choose 4-6 content pillars (themes) with a share in percent that adds up to 100, and the best days and times to post for the buyer countries (give times in the company\'s own time, India if unsure).',
    'Then plan the posts: spread them evenly over the weeks, mix the pillars by their share, include buyer-country festivals or trade fairs only if they really fall in this month, and never invent facts.',
    'Formats: "photo", "carousel", "reel idea" or "text".',
    'If results of earlier months are given, use them: give more share to the pillars, days, times and formats that got more engagement and leads, less to what did not work, and say so in the summary.',
    'Return ONLY JSON: {"summary": "2-3 sentences: the idea of this month", "pillars": [{"name","share","why"}], "best_times": [{"day","time","why"}], "items": [{"date":"YYYY-MM-DD","time":"HH:MM","platforms":["facebook","instagram"],"pillar","format","title","brief"}]}.',
  ].join('\n');
  const prompt = [
    `Month: ${month} (posts from ${firstDay} to ${month}-${String(days).padStart(2, '0')})`,
    `Posts per week: ${perWeek} (about ${Math.round((perWeek * (days - Number(firstDay.slice(8)) + 1)) / 7)} posts)`,
    `Platforms: ${platforms.join(', ')}`,
    b.focus ? `Focus this month: ${str(b.focus, 1000)}` : '',
    learned ? `What our earlier results say:\n${learned}` : '',
  ].filter(Boolean).join('\n');
  try {
    const j = parseJson(await ai.generateText(provider, k.key, k.text_model, system, prompt));
    if (!j || !Array.isArray(j.items)) return ApiResponse.error(res, 'The AI did not return a plan. Try again.', 502);
    const items = j.items.slice(0, 62).map((it) => ({
      id: newId('spi'),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(it.date)) && String(it.date).startsWith(month) && it.date >= firstDay ? it.date : '',
      time: TIME.test(String(it.time)) ? it.time : '10:00',
      platforms: (Array.isArray(it.platforms) ? it.platforms : platforms).filter((p) => platforms.includes(p)),
      pillar: str(it.pillar, 80), format: str(it.format, 30) || 'photo', title: str(it.title, 140), brief: str(it.brief, 800),
      post_id: null,
    })).filter((it) => it.date && it.title).map((it) => ({ ...it, platforms: it.platforms.length ? it.platforms : platforms }))
      .sort((a, b2) => `${a.date}${a.time}`.localeCompare(`${b2.date}${b2.time}`));
    if (!items.length) return ApiResponse.error(res, 'The AI plan had no usable dates. Try again.', 502);
    const plan = save({
      id: newId('spl'), kind: 'social_plan', owner_id: owner, month, status: 'draft', provider,
      summary: str(j.summary, 800),
      pillars: (Array.isArray(j.pillars) ? j.pillars : []).slice(0, 8).map((p) => ({ name: str(p.name, 80), share: Math.max(0, Math.min(100, Math.round(Number(p.share) || 0))), why: str(p.why, 300) })).filter((p) => p.name),
      best_times: (Array.isArray(j.best_times) ? j.best_times : []).slice(0, 8).map((t) => ({ day: str(t.day, 20), time: str(t.time, 10), why: str(t.why, 200) })),
      items, settings: { posts_per_week: perWeek, platforms, focus: str(b.focus, 1000) }, learned_from_results: Boolean(learned),
      created_by: req.user.id, created_at: nowIso(),
    });
    return ApiResponse.success(res, planView(plan), `Plan ready: ${items.length} posts for ${month}`, 201);
  } catch (err) { return ApiResponse.error(res, err.message, 400); }
};

const findPlan = (req) => plansOf(req.social.owner).find((p) => p.id === req.params.id);

/** Edit the plan: change / remove items before writing the posts. */
const updatePlan = async (req, res) => {
  const p = findPlan(req);
  if (!p) return ApiResponse.error(res, 'Plan not found', 404);
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : null;
  if (!items) return ApiResponse.error(res, 'Nothing to save', 400);
  const byId = Object.fromEntries((p.items || []).map((it) => [it.id, it]));
  p.items = items.slice(0, 62).map((it) => {
    const old = byId[it.id];
    if (!old) return null;
    if (old.post_id) return old; // already written: change it in the post itself
    return {
      ...old,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(it.date)) ? it.date : old.date,
      time: TIME.test(String(it.time)) ? it.time : old.time,
      title: str(it.title, 140) || old.title, brief: typeof it.brief === 'string' ? it.brief.slice(0, 800) : old.brief,
      platforms: Array.isArray(it.platforms) && it.platforms.length ? it.platforms.filter((x) => PLATFORMS.includes(x)) : old.platforms,
    };
  }).filter(Boolean);
  p.updated_at = nowIso();
  save(p);
  return ApiResponse.success(res, planView(p), 'Plan saved');
};

const deletePlan = async (req, res) => {
  const p = findPlan(req);
  if (!p) return ApiResponse.error(res, 'Plan not found', 404);
  const drafts = recs(p.owner_id, 'social_post').filter((x) => x.plan_id === p.id && ['draft', 'pending_approval'].includes(x.status));
  drafts.forEach((x) => remove(x.id));
  remove(p.id);
  return ApiResponse.success(res, { id: p.id }, `Plan deleted (${drafts.length} unpublished drafts removed; scheduled and posted ones stay)`);
};

/** The item's date + time (the owner's clock) as an ISO time. tz = minutes from getTimezoneOffset(). */
const itemTime = (it, tz) => new Date(Date.parse(`${it.date}T${it.time || '10:00'}:00Z`) + (Number.isFinite(tz) ? tz : -330) * 60000).toISOString();

const writeJob = async (owner, ownerName, planId, itemIds, tz, by) => {
  const plan = plansOf(owner).find((p) => p.id === planId);
  if (!plan) return;
  const provider = aiReady(owner).text;
  const k = provider ? keyOf(owner, provider) : null;
  const accounts = recs(owner, 'social_account'); // an expired login is shown when publishing; keep the account on the post
  const todo = (plan.items || []).filter((it) => !it.post_id && (!itemIds || itemIds.includes(it.id)));
  plan.job = { running: true, total: todo.length, done: 0, failed: 0, errors: [], started_at: nowIso() };
  save(plan);
  for (const it of todo) {
    try {
      if (!k) throw new Error('No AI key');
      const r = await writePost(owner, ownerName, provider, k, { topic: `${it.title}. ${it.brief}`, pillar: it.pillar, format: it.format, platforms: it.platforms });
      const post = save({
        id: newId('spo'), kind: 'social_post', owner_id: owner, status: 'draft',
        text: r.texts.facebook || r.texts.instagram || '', texts: r.texts, media_ids: [],
        account_ids: accounts.filter((a) => it.platforms.includes(a.platform)).map((a) => a.id),
        scheduled_at: itemTime(it, tz), note: r.image_idea ? `Picture idea: ${r.image_idea}` : '', image_idea: r.image_idea || '',
        plan_id: plan.id, plan_item_id: it.id, pillar: it.pillar, targets: [],
        created_by: by.id, created_by_name: by.name || '', created_at: nowIso(), updated_at: nowIso(),
      });
      it.post_id = post.id;
      plan.job.done += 1;
    } catch (err) {
      plan.job.failed += 1;
      plan.job.errors = [...plan.job.errors, `${it.title}: ${str(err.message, 160)}`].slice(-5);
      if (/key was not accepted|No AI key|credit/i.test(err.message)) { plan.job.stopped = err.message; break; }
    }
    save(plan);
  }
  plan.job.running = false;
  plan.job.finished_at = nowIso();
  save(plan);
};

const writePlanPosts = async (req, res) => {
  const p = findPlan(req);
  if (!p) return ApiResponse.error(res, 'Plan not found', 404);
  if (p.job && p.job.running) return ApiResponse.error(res, 'The posts are being written already', 409);
  if (!aiReady(req.social.owner).text) return ApiResponse.error(res, 'Add your AI key first (Social Media → AI settings).', 400);
  const ids = Array.isArray(req.body && req.body.item_ids) ? req.body.item_ids : null;
  const n = (p.items || []).filter((it) => !it.post_id && (!ids || ids.includes(it.id))).length;
  if (!n) return ApiResponse.error(res, 'Every post of this plan is written already', 400);
  const tz = Number(req.body && req.body.tz_offset);
  writeJob(req.social.owner, req.social.ownerName, p.id, ids, Number.isFinite(tz) ? tz : null, { id: req.user.id, name: req.user.name }).catch((e) => console.warn('[Social plan]', e.message));
  return ApiResponse.success(res, planView(p), `Writing ${n} posts with your AI…`, 202);
};

/** Schedule every written draft of the plan (staff: send them for approval). Posts that are not ready are listed. */
const schedulePlan = async (req, res) => {
  const p = findPlan(req);
  if (!p) return ApiResponse.error(res, 'Plan not found', 404);
  const posts = recs(p.owner_id, 'social_post').filter((x) => x.plan_id === p.id && x.status === 'draft');
  let done = 0;
  const notReady = [];
  for (const post of posts) {
    const next = { ...post };
    const item = (p.items || []).find((it) => it.id === post.plan_item_id) || {};
    const problem = applyAction(req, next, 'schedule');
    if (problem) { notReady.push({ post_id: post.id, title: item.title || (post.text || '').slice(0, 60), date: item.date || String(post.scheduled_at || '').slice(0, 10), problem }); continue; }
    next.updated_at = nowIso();
    save(next);
    done += 1;
  }
  if (done && p.status === 'draft') { p.status = 'approved'; p.approved_by = req.user.id; p.approved_at = nowIso(); save(p); }
  const word = req.social.isOwner ? 'scheduled' : 'sent to the owner for approval';
  return ApiResponse.success(res, { ...planView(p), scheduled: done, not_ready: notReady }, notReady.length ? `${done} posts ${word}. ${notReady.length} need something first (see the list).` : `${done} posts ${word}.`);
};

/** Drafts of the plan that go to Instagram but have no picture yet. */
const needPicture = (owner, plan) => {
  const ig = new Set(recs(owner, 'social_account').filter((a) => a.platform === 'instagram').map((a) => a.id));
  return recs(owner, 'social_post').filter((x) => x.plan_id === plan.id && ['draft', 'pending_approval'].includes(x.status) && !(x.media_ids || []).length && (x.account_ids || []).some((id) => ig.has(id)));
};

const picturesJob = async (owner, planId, by) => {
  const plan = plansOf(owner).find((p) => p.id === planId);
  if (!plan) return;
  const provider = aiReady(owner).image;
  const k = provider ? keyOf(owner, provider) : null;
  const todo = needPicture(owner, plan);
  plan.job = { running: true, kind: 'pictures', total: todo.length, done: 0, failed: 0, errors: [], started_at: nowIso() };
  save(plan);
  for (const post of todo) {
    const item = (plan.items || []).find((it) => it.id === post.plan_item_id) || {};
    try {
      if (!k) throw new Error('No picture AI key');
      const img = await ai.generateImage(provider, k.key, k.image_model, `${post.image_idea || `${item.title}. ${item.brief}`}\nStyle: clean, professional photo for a B2B export company's social media post. No text in the picture.`);
      const buf = Buffer.from(img.data, 'base64');
      if (buf.length > MAX_AI_PICTURE) throw new Error('The picture from the AI is too large');
      const media = saveMedia(owner, by.id, /png/.test(img.mime) ? 'image/png' : 'image/jpeg', buf, `ai:${provider}`);
      post.media_ids = [media.id];
      post.updated_at = nowIso();
      save(post);
      plan.job.done += 1;
    } catch (err) {
      plan.job.failed += 1;
      plan.job.errors = [...plan.job.errors, `${item.title || post.id}: ${str(err.message, 160)}`].slice(-5);
      if (/key was not accepted|No picture AI key|credit/i.test(err.message)) { plan.job.stopped = err.message; break; }
    }
    save(plan);
  }
  plan.job.running = false;
  plan.job.finished_at = nowIso();
  save(plan);
};

/** Make an AI picture for every Instagram draft of the plan that has none. */
const planPictures = async (req, res) => {
  const p = findPlan(req);
  if (!p) return ApiResponse.error(res, 'Plan not found', 404);
  if (p.job && p.job.running) return ApiResponse.error(res, 'The AI is already working on this plan', 409);
  if (!aiReady(req.social.owner).image) return ApiResponse.error(res, 'Add an OpenAI, Gemini or xAI key to make pictures (Social Media → AI settings).', 400);
  const n = needPicture(req.social.owner, p).length;
  if (!n) return ApiResponse.error(res, 'Every Instagram post of this plan already has a picture', 400);
  picturesJob(req.social.owner, p.id, { id: req.user.id }).catch((e) => console.warn('[Social plan pictures]', e.message));
  return ApiResponse.success(res, planView(p), `Making ${n} pictures with your AI…`, 202);
};

/** Without a photo: post those drafts on Facebook only (Instagram is taken off them). */
const planFacebookOnly = async (req, res) => {
  const p = findPlan(req);
  if (!p) return ApiResponse.error(res, 'Plan not found', 404);
  const ig = new Set(recs(req.social.owner, 'social_account').filter((a) => a.platform === 'instagram').map((a) => a.id));
  const posts = needPicture(req.social.owner, p);
  posts.forEach((post) => { post.account_ids = (post.account_ids || []).filter((id) => !ig.has(id)); post.updated_at = nowIso(); save(post); });
  return ApiResponse.success(res, { ...planView(p), changed: posts.length }, `${posts.length} posts will go to Facebook only. Press "Schedule all" again.`);
};

/* ------------------------------------------------------------------ */
/* Part 2: results from Facebook / Instagram, comments inbox (reply,   */
/* make a lead), monthly report + AI review, next plan learns from it  */
/* ------------------------------------------------------------------ */

const METRIC_KEYS = ['likes', 'comments', 'shares', 'saves', 'reach', 'clicks'];
const engagementOf = (m) => (m ? (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0) + (m.clicks || 0) : 0);
const postMetrics = (p) => {
  const sum = Object.fromEntries(METRIC_KEYS.map((k) => [k, 0]));
  (p.targets || []).forEach((t) => { if (t.metrics) METRIC_KEYS.forEach((k) => { sum[k] += Number(t.metrics[k]) || 0; }); });
  return { ...sum, engagement: engagementOf(sum) };
};
const comments = (owner) => recs(owner, 'social_comment');

/** Fetch results and new comments of the company's posts published in the last 35 days. */
async function refreshResults(owner) {
  const accounts = recs(owner, 'social_account');
  const since = Date.now() - 35 * 864e5;
  const posts = recs(owner, 'social_post').filter((p) => ['posted', 'partial'].includes(p.status) && Date.parse(p.posted_at || p.updated_at) >= since);
  const known = new Set(comments(owner).map((c) => c.ext_id));
  let updated = 0;
  let newComments = 0;
  for (const p of posts) {
    for (const t of p.targets || []) {
      if (t.status !== 'posted' || !t.ext_id) continue;
      const a = accounts.find((x) => x.id === t.account_id);
      if (!a) continue;
      let token;
      try { token = mailer.decryptSecret(a.token_enc); } catch { continue; }
      try { t.metrics = { ...(await meta.fetchMetrics(a.platform, t.ext_id, token)), fetched_at: nowIso() }; updated += 1; } catch (err) { t.metrics_error = str(err.message, 200); }
      try {
        for (const c of await meta.fetchComments(a.platform, t.ext_id, token)) {
          if (!c.ext_id || known.has(c.ext_id) || (a.platform === 'facebook' && c.author_id === a.ext_id) || (a.platform === 'instagram' && a.username && c.author_id === a.username)) continue;
          known.add(c.ext_id);
          save({ id: newId('scm'), kind: 'social_comment', owner_id: owner, post_id: p.id, account_id: a.id, platform: a.platform, ext_id: c.ext_id, author: str(c.author, 120), author_id: str(c.author_id, 80), text: str(c.text, 2000), created_time: c.created_time || nowIso(), status: 'new', replies: [], lead_id: null, created_at: nowIso() });
          newComments += 1;
        }
      } catch { /* comments are optional */ }
    }
    p.results_at = nowIso();
    save(p);
  }
  return { posts: posts.length, updated, new_comments: newComments };
}

const refreshResultsNow = async (req, res) => {
  const r = await refreshResults(req.social.owner);
  return ApiResponse.success(res, r, r.posts ? `Results updated for ${r.posts} posts${r.new_comments ? `, ${r.new_comments} new comments` : ''}` : 'No published posts in the last 35 days yet');
};

let metricsTimer = null;
let metricsRunning = false;
const metricsTick = async () => {
  if (metricsRunning) return;
  metricsRunning = true;
  try {
    const owners = [...new Set(all().filter((r) => r.kind === 'social_post' && ['posted', 'partial'].includes(r.status)).map((r) => r.owner_id))];
    for (const o of owners) { try { await refreshResults(o); } catch (e) { console.warn('[Social results]', e.message); } }
  } finally { metricsRunning = false; }
};
const startSocialResults = () => {
  if (metricsTimer) return;
  metricsTimer = setInterval(metricsTick, Number(process.env.SOCIAL_METRICS_MS) || 3 * 3600 * 1000);
  if (metricsTimer.unref) metricsTimer.unref();
};

/* ---------------- Comments inbox ---------------- */

const commentView = (c, owner) => {
  const post = recs(owner, 'social_post').find((p) => p.id === c.post_id);
  return { ...c, post: post ? { id: post.id, text: (post.text || Object.values(post.texts || {})[0] || '').slice(0, 120), posted_at: post.posted_at, permalink: ((post.targets || []).find((t) => t.account_id === c.account_id) || {}).permalink || '' } : null };
};

const listComments = async (req, res) => {
  const status = ['new', 'done', 'all'].includes(req.query.status) ? req.query.status : 'all';
  const list = comments(req.social.owner).filter((c) => status === 'all' || c.status === status).sort((a, b) => String(b.created_time).localeCompare(String(a.created_time))).slice(0, 300);
  return ApiResponse.success(res, list.map((c) => commentView(c, req.social.owner)));
};

const findComment = (req) => comments(req.social.owner).find((c) => c.id === req.params.id);

const replyComment = async (req, res) => {
  const c = findComment(req);
  if (!c) return ApiResponse.error(res, 'Comment not found', 404);
  const text = str(req.body && req.body.text, 1000);
  if (!text) return ApiResponse.error(res, 'Write the reply', 400);
  const a = recs(req.social.owner, 'social_account').find((x) => x.id === c.account_id);
  if (!a) return ApiResponse.error(res, 'This account is no longer connected', 400);
  try {
    await meta.replyToComment(c.platform, c.ext_id, mailer.decryptSecret(a.token_enc), text);
    c.replies = [...(c.replies || []), { text, at: nowIso(), by: req.user.name || '' }];
    c.status = 'done';
    save(c);
    return ApiResponse.success(res, commentView(c, req.social.owner), 'Reply posted');
  } catch (err) { return ApiResponse.error(res, err.code === 190 ? 'Facebook login expired. Connect the account again.' : err.message, 400); }
};

const markComment = async (req, res) => {
  const c = findComment(req);
  if (!c) return ApiResponse.error(res, 'Comment not found', 404);
  c.status = req.body && req.body.status === 'new' ? 'new' : 'done';
  save(c);
  return ApiResponse.success(res, commentView(c, req.social.owner));
};

/** A comment from a buyer becomes a lead (source: the post), so the report can count leads per post. */
const commentToLead = async (req, res) => {
  const c = findComment(req);
  if (!c) return ApiResponse.error(res, 'Comment not found', 404);
  if (c.lead_id && dataStore.leads.some((l) => l.id === c.lead_id)) return ApiResponse.error(res, 'A lead was already made from this comment', 409);
  const b = req.body || {};
  const company = str(b.company_name, 150) || c.author;
  const today = nowIso().slice(0, 10);
  const owner = dataStore.users.find((u) => u.id === req.social.owner) || {};
  const remark = `${c.platform === 'facebook' ? 'Facebook' : 'Instagram'} comment: "${str(c.text, 300)}"`;
  const lead = {
    id: generateId('lead'), company_id: owner.company_id || owner.id, owner_id: req.social.owner,
    name: company, company_name: company, type: 'Export',
    contacts: [{ name: str(b.contact_name, 100) || c.author, phone: str(b.phone, 30), email: str(b.email, 120) }],
    contact_person: str(b.contact_name, 100) || c.author, email: str(b.email, 120), phone: str(b.phone, 30), whatsapp: str(b.phone, 30), extra_whatsapp: [],
    website: '', country: str(b.country, 80), source: c.platform === 'facebook' ? 'Facebook' : 'Instagram', address: '', state: '', city: '', pincode: '',
    credit_rating: 'Not Rated', turnover: '', sourcing_region: '', legacy_industry_type: '',
    products: [], product: '', quantity: 0, quantity_unit: 'MT', price: 0, value: 0,
    stage: 'Lead Generation', priority: 'Medium', export_requirements: {}, tags: ['social-media'],
    assigned_to: req.user.id, created_by_id: req.user.id, created_by_name: req.user.name || '',
    follow_up_date: today, follow_up_time: '11:00', today_remarks: remark, next_follow_up_action: 'Reply to the buyer and ask their requirement',
    previous_remarks: [{ today_remark: remark, planned_action: 'Reply to the buyer and ask their requirement', remark: `Interaction: ${remark}`, follow_up_date: today, date: nowIso(), author: req.user.name || '', author_id: req.user.id }],
    social_post_id: c.post_id, social_comment_id: c.id,
    created_at: nowIso(), updated_at: nowIso(),
  };
  dataStore.leads.unshift(lead);
  dbSync.saveLead(lead);
  c.lead_id = lead.id;
  c.status = 'done';
  save(c);
  return ApiResponse.success(res, { comment: commentView(c, req.social.owner), lead_id: lead.id }, `Lead "${company}" made (follow-up today)`, 201);
};

/* ---------------- Monthly report ---------------- */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Numbers of one month: totals, by pillar / weekday / hour / format / platform, top and weak posts, leads per post. tz = minutes from getTimezoneOffset(). */
function monthReport(owner, month, tz = -330) {
  const local = (iso) => new Date(Date.parse(iso) - tz * 60000);
  const posts = recs(owner, 'social_post').filter((p) => ['posted', 'partial'].includes(p.status) && p.posted_at && local(p.posted_at).toISOString().slice(0, 7) === month);
  const leads = (dataStore.leads || []).filter((l) => l.owner_id === owner && l.social_post_id);
  const plans = plansOf(owner);
  const itemOf = (p) => { const plan = plans.find((x) => x.id === p.plan_id); return plan ? (plan.items || []).find((it) => it.id === p.plan_item_id) : null; };
  const rows = posts.map((p) => {
    const m = postMetrics(p);
    const it = itemOf(p) || {};
    const d = local(p.posted_at);
    return {
      id: p.id, text: (p.text || Object.values(p.texts || {})[0] || '').slice(0, 140), title: it.title || '', pillar: p.pillar || it.pillar || 'Other', format: it.format || ((p.media_ids || []).length ? 'photo' : 'text'),
      platforms: [...new Set((p.targets || []).filter((t) => t.status === 'posted').map((t) => t.platform))], posted_at: p.posted_at,
      day: DAYS[d.getUTCDay()], hour: d.getUTCHours(), ...m, leads: leads.filter((l) => l.social_post_id === p.id).length,
      permalink: ((p.targets || []).find((t) => t.permalink) || {}).permalink || '',
    };
  });
  const group = (key) => {
    const g = {};
    rows.forEach((r) => { const k = Array.isArray(r[key]) ? r[key] : [r[key]]; k.forEach((x) => { const e = g[x] || (g[x] = { name: String(x), posts: 0, engagement: 0, reach: 0, leads: 0 }); e.posts += 1; e.engagement += r.engagement; e.reach += r.reach; e.leads += r.leads; }); });
    return Object.values(g).map((e) => ({ ...e, avg_engagement: e.posts ? Math.round((e.engagement / e.posts) * 10) / 10 : 0 })).sort((a, b) => b.avg_engagement - a.avg_engagement);
  };
  const totals = rows.reduce((t, r) => { METRIC_KEYS.forEach((k) => { t[k] += r[k]; }); t.engagement += r.engagement; t.leads += r.leads; return t; }, { ...Object.fromEntries(METRIC_KEYS.map((k) => [k, 0])), engagement: 0, leads: 0 });
  const byEng = [...rows].sort((a, b) => b.engagement - a.engagement);
  const slot = (h) => (h < 12 ? 'Morning (before 12)' : h < 16 ? 'Afternoon (12–4)' : 'Evening (after 4)');
  return {
    month, posts: rows.length, totals: { ...totals, avg_engagement: rows.length ? Math.round((totals.engagement / rows.length) * 10) / 10 : 0 },
    by_pillar: group('pillar'), by_day: group('day'), by_time: group('slot'), by_format: group('format'), by_platform: group('platforms'),
    top: byEng.slice(0, 5), weak: rows.length > 5 ? byEng.slice(-3).reverse() : [],
    comments: comments(owner).filter((c) => rows.some((r) => r.id === c.post_id)).length,
    measured_at: rows.length ? rows.map((r) => r.posted_at).sort().pop() : null,
    rows: rows.map((r) => ({ ...r, slot: slot(r.hour) })),
  };
}
// slot is added for grouping
const monthReportWithSlots = (owner, month, tz) => {
  const r = monthReport(owner, month, tz);
  const g = {};
  r.rows.forEach((row) => { const e = g[row.slot] || (g[row.slot] = { name: row.slot, posts: 0, engagement: 0, reach: 0, leads: 0 }); e.posts += 1; e.engagement += row.engagement; e.reach += row.reach; e.leads += row.leads; });
  r.by_time = Object.values(g).map((e) => ({ ...e, avg_engagement: e.posts ? Math.round((e.engagement / e.posts) * 10) / 10 : 0 })).sort((a, b) => b.avg_engagement - a.avg_engagement);
  return r;
};

const getReport = async (req, res) => {
  const month = MONTH.test(String(req.query.month)) ? req.query.month : nowIso().slice(0, 7);
  const tz = Number(req.query.tz_offset);
  const r = monthReportWithSlots(req.social.owner, month, Number.isFinite(tz) ? tz : -330);
  const review = recs(req.social.owner, 'social_review').find((x) => x.month === month) || null;
  return ApiResponse.success(res, { ...r, review: review ? { text: review.text, points: review.points, created_at: review.created_at } : null });
};

const reviewWithAi = async (req, res) => {
  const owner = req.social.owner;
  const provider = aiReady(owner).text;
  const k = provider ? keyOf(owner, provider) : null;
  if (!k) return ApiResponse.error(res, 'Add your AI key first (Social Media → AI settings).', 400);
  const month = MONTH.test(String(req.body && req.body.month)) ? req.body.month : nowIso().slice(0, 7);
  const tz = Number(req.body && req.body.tz_offset);
  const r = monthReportWithSlots(owner, month, Number.isFinite(tz) ? tz : -330);
  if (!r.posts) return ApiResponse.error(res, 'No published posts in this month yet', 400);
  const system = [
    'You are the social media manager of this B2B export / import company. Review last month\'s results honestly and simply.',
    brandContext(owner, req.social.ownerName),
    'Use only the numbers given. Say what worked, what did not, and 3-5 concrete changes for next month (pillars, days/times, formats, topics). Short sentences, no jargon.',
    'Return ONLY JSON: {"summary": "3-4 sentences", "worked": ["..."], "not_worked": ["..."], "next_month": ["..."]}.',
  ].join('\n');
  const prompt = JSON.stringify({ month, posts: r.posts, totals: r.totals, by_pillar: r.by_pillar, by_day: r.by_day, by_time: r.by_time, by_format: r.by_format, by_platform: r.by_platform, top: r.top.map((x) => ({ title: x.title || x.text, pillar: x.pillar, engagement: x.engagement, leads: x.leads })), weak: r.weak.map((x) => ({ title: x.title || x.text, pillar: x.pillar, engagement: x.engagement })) });
  try {
    const j = parseJson(await ai.generateText(provider, k.key, k.text_model, system, prompt));
    if (!j) return ApiResponse.error(res, 'The AI did not return a review. Try again.', 502);
    const list = (v) => (Array.isArray(v) ? v.map((x) => str(String(x), 300)).filter(Boolean).slice(0, 6) : []);
    const prev = recs(owner, 'social_review').find((x) => x.month === month);
    const rec = save({ ...(prev || { id: newId('srv'), kind: 'social_review', owner_id: owner, month }), text: str(j.summary, 1200), points: { worked: list(j.worked), not_worked: list(j.not_worked), next_month: list(j.next_month) }, created_at: nowIso(), provider });
    return ApiResponse.success(res, { text: rec.text, points: rec.points, created_at: rec.created_at }, 'AI review ready');
  } catch (err) { return ApiResponse.error(res, err.message, 400); }
};

/** For the next month's plan: what the results of the last months say (empty when there are none). */
const learningsFor = (owner, month) => {
  const [y, m] = month.split('-').map(Number);
  const prevMonth = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const prev2 = new Date(Date.UTC(y, m - 3, 1)).toISOString().slice(0, 7);
  const lines = [];
  for (const mm of [prevMonth, prev2]) {
    const r = monthReportWithSlots(owner, mm, -330);
    if (!r.posts) continue;
    const fmt = (arr) => arr.slice(0, 4).map((e) => `${e.name} (avg ${e.avg_engagement}, ${e.posts} posts${e.leads ? `, ${e.leads} leads` : ''})`).join('; ');
    lines.push(`Results of ${mm}: ${r.posts} posts, avg engagement ${r.totals.avg_engagement}, ${r.totals.leads} leads from posts.`);
    lines.push(`  Pillars best to worst: ${fmt(r.by_pillar)}`);
    lines.push(`  Days best to worst: ${fmt(r.by_day)}`);
    lines.push(`  Times: ${fmt(r.by_time)}. Formats: ${fmt(r.by_format)}`);
    if (r.top.length) lines.push(`  Best posts: ${r.top.slice(0, 3).map((x) => `"${x.title || x.text.slice(0, 60)}"`).join(', ')}`);
    const rv = recs(owner, 'social_review').find((x) => x.month === mm);
    if (rv && rv.points && rv.points.next_month && rv.points.next_month.length) lines.push(`  Review advice: ${rv.points.next_month.join(' | ')}`);
  }
  return lines.join('\n');
};

module.exports = {
  refreshResultsNow, startSocialResults, metricsTick, listComments, replyComment, markComment, commentToLead, getReport, reviewWithAi, learningsFor, monthReport: monthReportWithSlots,
  planPictures, planFacebookOnly,
  requireFeature, ownerOnly, getStatus,
  startConnect, oauthCallback, listAccounts, disconnectAccount,
  getAiSettings, saveAiSettings, testAi, writeWithAi, ideasWithAi, imageWithAi,
  uploadMedia, getMedia,
  listPosts, createPost, updatePost, deletePost, approvePost, rejectPost, retryPost,
  getBrand, saveBrand, draftBrand, getPlan, makePlan, updatePlan, deletePlan, writePlanPosts, schedulePlan,
  tick, startSocialScheduler, readState, makeState,
};
