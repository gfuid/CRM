/**
 * Keeps the free hosting awake and the free MongoDB cluster active.
 *
 * 1. Self ping: every KEEPALIVE_MINUTES (default 10) the server calls its own public /health URL.
 *    Render's free plan sleeps a service after 15 minutes without incoming requests; a request through
 *    the public URL counts as incoming traffic. Render sets RENDER_EXTERNAL_URL automatically.
 *    (If the server is ever stopped, an outside pinger such as UptimeRobot / cron-job.org / the GitHub
 *    keep-alive workflow wakes it again - see README.)
 *
 * 2. Database heartbeat: MongoDB Atlas pauses a free (M0) cluster after 30 days with no activity.
 *    Every DB_HEARTBEAT_HOURS (default 6) the server writes one tiny document, so the cluster is never idle,
 *    even when nobody logs in for weeks.
 */
const { dataStore } = require('../repositories/dataStore');

const HEARTBEAT_ID = 'db_heartbeat';

const selfUrl = () => {
  const raw = process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL || '';
  return raw ? raw.replace(/\/$/, '') : '';
};

const pingSelf = async () => {
  const url = selfUrl();
  if (!url) return { ok: false, skipped: true };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${url}/health?keepalive=1`, { signal: ctrl.signal, headers: { 'User-Agent': 'crm-keepalive' } });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(t);
  }
};

/** Writes one small document to MongoDB (counts as real activity for Atlas). */
const dbHeartbeat = async () => {
  try {
    const { isDbConnected } = require('../config/db');
    if (!isDbConnected()) return { ok: false, skipped: true };
    const models = require('../models');
    const now = new Date().toISOString();
    const prev = (dataStore.appSettings || []).find((s) => s.id === HEARTBEAT_ID) || {};
    const doc = { id: HEARTBEAT_ID, last_at: now, count: (Number(prev.count) || 0) + 1 };
    await models.AppSetting.findOneAndUpdate({ id: HEARTBEAT_ID }, doc, { upsert: true, new: true });
    await models.Lead.countDocuments({}).limit(1); // and one read
    const list = dataStore.appSettings || (dataStore.appSettings = []);
    const i = list.findIndex((s) => s.id === HEARTBEAT_ID);
    if (i === -1) list.push(doc); else list[i] = doc;
    return { ok: true, at: now };
  } catch (err) {
    console.warn('[Heartbeat] database write failed:', err.message);
    return { ok: false, error: err.message };
  }
};

const startKeepAlive = () => {
  const pingEvery = Math.max(5, Number(process.env.KEEPALIVE_MINUTES) || 10) * 60 * 1000;
  const dbEvery = Math.max(1, Number(process.env.DB_HEARTBEAT_HOURS) || 6) * 3600 * 1000;
  if (selfUrl()) {
    const t1 = setInterval(async () => {
      const r = await pingSelf();
      if (!r.ok) console.warn('[KeepAlive] self ping failed:', r.status || r.error);
    }, pingEvery);
    t1.unref();
    console.log(`💓 Keep-alive: pinging ${selfUrl()}/health every ${pingEvery / 60000} min`);
  } else {
    console.log('💓 Keep-alive: no public URL (RENDER_EXTERNAL_URL / KEEPALIVE_URL) set, self ping off');
  }
  const t2 = setInterval(dbHeartbeat, dbEvery);
  t2.unref();
  setTimeout(dbHeartbeat, 60 * 1000).unref(); // one shortly after start
};

module.exports = { startKeepAlive, pingSelf, dbHeartbeat, selfUrl };
