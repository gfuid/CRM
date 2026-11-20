/**
 * Facebook Pages + Instagram (professional accounts) through Meta's Graph API, for the Social Media section.
 *
 * One Meta app belongs to the platform (META_APP_ID / META_APP_SECRET on the server). Each company presses
 * "Connect Facebook / Instagram", logs in on Facebook and allows access; we keep the Page tokens (encrypted).
 * META_GRAPH_BASE / META_OAUTH_DIALOG can point to a fake server in tests.
 */
const graphBase = () => (process.env.META_GRAPH_BASE || 'https://graph.facebook.com/v21.0').replace(/\/$/, '');
const dialogUrl = () => (process.env.META_OAUTH_DIALOG || 'https://www.facebook.com/v21.0/dialog/oauth');
const appId = () => String(process.env.META_APP_ID || '').trim();
const appSecret = () => String(process.env.META_APP_SECRET || '').trim();
const ready = () => Boolean(appId() && appSecret());

// What the CRM asks the owner to allow (each one is needed for a feature on the page)
const SCOPES = [
  'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_engagement', 'read_insights',
  'business_management', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_comments', 'instagram_manage_insights',
];

const graphError = (body, status) => {
  const e = (body && body.error) || {};
  const err = new Error(e.error_user_msg || e.message || `Facebook answered ${status}`);
  err.status = status;
  err.code = e.code;
  err.subcode = e.error_subcode;
  return err;
};

const call = async (method, path, { token, query, form, timeoutMs = 30000 } = {}) => {
  const url = new URL(`${graphBase()}/${String(path).replace(/^\//, '')}`);
  Object.entries(query || {}).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.set(k, v));
  if (token) url.searchParams.set('access_token', token);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {},
      body: form ? new URLSearchParams(Object.entries(form).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString() : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok || (data && data.error)) throw graphError(data, res.status);
    return data || {};
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Facebook / Instagram did not answer in time. Please try again.');
    if (!err.status && /fetch failed|ENOTFOUND|ECONNREFUSED/i.test(err.message)) throw new Error('Could not reach Facebook / Instagram. Please try again.');
    throw err;
  } finally {
    clearTimeout(t);
  }
};

/** The Facebook login page the owner is sent to. */
const loginUrl = (redirectUri, state) => {
  const u = new URL(dialogUrl());
  u.searchParams.set('client_id', appId());
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPES.join(','));
  return u.toString();
};

/** code -> long-lived user token -> the Pages (with their own tokens) and the Instagram accounts linked to them. */
const exchangeAndList = async (code, redirectUri) => {
  const short = await call('GET', 'oauth/access_token', { query: { client_id: appId(), client_secret: appSecret(), redirect_uri: redirectUri, code } });
  const long = await call('GET', 'oauth/access_token', { query: { grant_type: 'fb_exchange_token', client_id: appId(), client_secret: appSecret(), fb_exchange_token: short.access_token } });
  const userToken = long.access_token || short.access_token;
  const pages = [];
  let next = { fields: 'id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}', limit: 100 };
  for (let i = 0; i < 5 && next; i++) {
    const r = await call('GET', 'me/accounts', { token: userToken, query: next });
    pages.push(...(r.data || []));
    next = r.paging && r.paging.cursors && r.paging.next ? { ...next, after: r.paging.cursors.after } : null;
  }
  return { userToken, pages };
};

/* ---------------- Publishing ---------------- */

/** Facebook Page: text (+ link) or one photo with a caption. Returns { id, permalink }. */
const publishFacebook = async (pageId, token, { message, imageUrl, link }) => {
  const r = imageUrl
    ? await call('POST', `${pageId}/photos`, { token, form: { url: imageUrl, caption: message || '', published: 'true' } })
    : await call('POST', `${pageId}/feed`, { token, form: { message: message || '', link: link || undefined } });
  const id = r.post_id || r.id;
  let permalink = '';
  try { permalink = (await call('GET', id, { token, query: { fields: 'permalink_url' } })).permalink_url || ''; } catch { /* the post is up; the link is optional */ }
  return { id, permalink };
};

/** Instagram: create the media container from a public picture link, wait until Meta has it, then publish. */
const publishInstagram = async (igId, token, { caption, imageUrl }, { waitMs = 1500, tries = 20 } = {}) => {
  if (!imageUrl) throw new Error('Instagram needs a picture. Add a photo to this post.');
  const c = await call('POST', `${igId}/media`, { token, form: { image_url: imageUrl, caption: caption || '' } });
  for (let i = 0; i < tries; i++) {
    const s = await call('GET', c.id, { token, query: { fields: 'status_code,status' } });
    if (s.status_code === 'FINISHED' || !s.status_code) break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram could not use the picture (${s.status || s.status_code}).`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  const p = await call('POST', `${igId}/media_publish`, { token, form: { creation_id: c.id } });
  let permalink = '';
  try { permalink = (await call('GET', p.id, { token, query: { fields: 'permalink' } })).permalink || ''; } catch { /* optional */ }
  return { id: p.id, permalink };
};

module.exports = { ready, appId, loginUrl, exchangeAndList, publishFacebook, publishInstagram, call, SCOPES };
