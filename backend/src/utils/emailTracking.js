/**
 * Open / click tracking and the daily sending limit for Email Marketing.
 *
 * - Every recipient of a campaign gets a short random id (`rid`).
 * - The mail carries a 1x1 image (open) and every http(s) link goes through the CRM (click).
 *   Both URLs hold a signed token, so nobody can fake opens for another company,
 *   and the click URL is signed too, so the CRM can never be used to redirect to a strange site.
 * - The daily limit is a rolling 24 hours (that is how Gmail counts).
 */
const crypto = require('crypto');
const config = require('../config/env');

const key = () => crypto.createHash('sha256').update(`track|${config.mailEncKey || config.jwtSecret}`).digest();
const sign = (value, len = 16) => crypto.createHmac('sha256', key()).update(String(value)).digest('base64url').slice(0, len);

const newRid = () => crypto.randomBytes(6).toString('base64url');

const makeToken = (campaignId, rid) => {
  const payload = Buffer.from(`${campaignId}|${rid}`).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

const parseToken = (token) => {
  const [payload, sig] = String(token || '').replace(/\.gif$/i, '').split('.');
  if (!payload || !sig || sign(payload) !== sig) return null;
  const [campaignId, rid] = Buffer.from(payload, 'base64url').toString('utf8').split('|');
  return campaignId && rid ? { campaignId, rid } : null;
};

const base = () => `${config.apiPublicUrl}/api/v1/email/t`;
const openUrl = (token) => `${base()}/o/${token}.gif`;
const clickUrl = (token, url) => `${base()}/c/${token}?u=${encodeURIComponent(url)}&s=${sign(`${token}|${url}`)}`;
const clickTargetOk = (token, url, s) => /^https?:\/\//i.test(String(url || '')) && sign(`${token}|${url}`) === s;

const decodeEntities = (s) => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const encodeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Sends every http(s) link of the mail body through the click counter, and adds the open pixel. */
const addTracking = (bodyHtml, token) => {
  const linked = String(bodyHtml || '').replace(/(<a\b[^>]*?\bhref\s*=\s*)(["'])(https?:\/\/[^"']+)\2/gi, (all, start, q, href) => {
    const url = decodeEntities(href);
    return `${start}${q}${encodeAttr(clickUrl(token, url))}${q}`;
  });
  return `${linked}<img src="${openUrl(token)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />`;
};

// A transparent 1x1 GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/* ---------------- daily limit ---------------- */

const DAY_MS = 24 * 3600 * 1000;

/** A sensible default for the provider: Gmail ~500/day, Outlook ~300/day, Zoho free ~50/day. */
const defaultDailyLimit = (settings = {}) => {
  const h = `${settings.provider || ''} ${settings.host || ''}`.toLowerCase();
  if (/gmail|google|yahoo/.test(h)) return 450;
  if (/outlook|office365|hotmail|live\./.test(h)) return 280;
  if (/zoho/.test(h)) return 200;
  return 500;
};

const dailyLimitOf = (settings = {}) => {
  const n = Number(settings.daily_limit);
  return Number.isFinite(n) && n >= 1 ? Math.min(100000, Math.floor(n)) : defaultDailyLimit(settings);
};

/** Mails this owner's campaigns sent in the last 24 hours. */
const sentLast24h = (campaigns, now = Date.now()) => {
  let n = 0;
  for (const c of campaigns) {
    for (const r of c.recipients || []) {
      if (r.status === 'sent' && r.sent_at && now - Date.parse(r.sent_at) < DAY_MS) n += 1;
    }
  }
  return n;
};

/** When the oldest mail in the window falls out, i.e. when sending may continue. */
const nextFreeAt = (campaigns, limit, now = Date.now()) => {
  const times = [];
  for (const c of campaigns) {
    for (const r of c.recipients || []) {
      const t = r.status === 'sent' && r.sent_at ? Date.parse(r.sent_at) : NaN;
      if (Number.isFinite(t) && now - t < DAY_MS) times.push(t);
    }
  }
  if (times.length < limit) return new Date(now).toISOString();
  times.sort((a, b) => a - b);
  return new Date(times[times.length - limit] + DAY_MS).toISOString();
};

module.exports = {
  newRid,
  makeToken,
  parseToken,
  openUrl,
  clickUrl,
  clickTargetOk,
  addTracking,
  PIXEL,
  DAY_MS,
  defaultDailyLimit,
  dailyLimitOf,
  sentLast24h,
  nextFreeAt,
};
