/**
 * Phone / desktop push notifications (Web Push, free: no Firebase, no paid service).
 *
 * - Each person turns it on once per device in the CRM (the browser asks for permission).
 * - What is sent:
 *     1. a lead or follow-up whose time has come ("Follow-up now: Saigon Feed Mill · Send CIF price")
 *     2. a task whose deadline has come
 *     3. every new bell notification meant for that person (task assigned, ticket reply, daily report…)
 *     4. a morning summary at PUSH_MORNING_HOUR (default 9) when something is due today or overdue
 * - VAPID keys: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY on the server if set; otherwise made once and kept
 *   (private key encrypted) in appSettings, so nothing has to be configured.
 * - Each device is an appSettings row `push:<userId>`; what was already sent is remembered there too,
 *   so a restart never sends the same reminder twice.
 */
const webpush = require('web-push');
const { dataStore, dbSync } = require('../repositories/dataStore');
const { todayISO, businessHourNow, localDateTime } = require('../utils/access');

const KEYS_ID = 'push:vapid';
const MAX_DEVICES = 10;
const MAX_SENT = 400;
const LATE_MS = 2 * 60 * 60 * 1000; // a reminder is still sent up to 2 hours late (server asleep, restart)
const FINAL_STAGES = ['closed won', 'closed lost', 'won', 'lost', 'closed'];
const OPEN_FU = ['Scheduled', 'Pending', 'Rescheduled'];
const dayOf = (v) => (v ? String(v).split('T')[0] : '');
const timeOf = (v) => (/^\d{1,2}:\d{2}$/.test(String(v || '').trim()) ? String(v).trim() : '');

const settingsList = () => dataStore.appSettings || (dataStore.appSettings = []);
const findRow = (id) => settingsList().find((s) => s.id === id);
const putRow = (row) => {
  const list = settingsList();
  const i = list.findIndex((s) => s.id === row.id);
  const next = { ...row, updated_at: new Date().toISOString() };
  if (i >= 0) list[i] = next; else list.push(next);
  dbSync.saveAppSetting(next);
  return next;
};

// ---------- keys ----------
let keys = null;
const getKeys = () => {
  if (keys) return keys;
  const { encryptSecret, decryptSecret } = require('./mailer.service');
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const row = findRow(KEYS_ID);
    const priv = row && row.private_enc ? decryptSecret(row.private_enc) : '';
    if (row && row.public_key && priv) {
      keys = { publicKey: row.public_key, privateKey: priv };
    } else {
      const made = webpush.generateVAPIDKeys();
      putRow({ id: KEYS_ID, kind: 'push_keys', public_key: made.publicKey, private_enc: encryptSecret(made.privateKey) });
      keys = made;
    }
  }
  const subject = process.env.VAPID_SUBJECT || `mailto:${process.env.SUPPORT_EMAIL || 'support@travel-trade.co.in'}`;
  webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
  return keys;
};

// ---------- devices ----------
const rowOf = (userId) => findRow(`push:${userId}`) || { id: `push:${userId}`, kind: 'push_devices', user_id: userId, devices: [], sent: [] };
const devicesOf = (userId) => (findRow(`push:${userId}`)?.devices || []);

const cleanSub = (sub) => {
  if (!sub || typeof sub !== 'object') return null;
  const endpoint = String(sub.endpoint || '');
  if (!/^https:\/\/[^\s]{10,1000}$/.test(endpoint)) return null;
  const p256dh = String(sub.keys?.p256dh || '');
  const auth = String(sub.keys?.auth || '');
  if (!/^[A-Za-z0-9_-]{20,200}={0,2}$/.test(p256dh) || !/^[A-Za-z0-9_-]{8,100}={0,2}$/.test(auth)) return null;
  return { endpoint, keys: { p256dh, auth } };
};

const addDevice = (userId, sub, label = '') => {
  const clean = cleanSub(sub);
  if (!clean) return null;
  const row = rowOf(userId);
  const others = (row.devices || []).filter((d) => d.endpoint !== clean.endpoint);
  const devices = [{ ...clean, label: String(label || '').slice(0, 80), added_at: new Date().toISOString() }, ...others].slice(0, MAX_DEVICES);
  putRow({ ...row, devices });
  return devices.length;
};

const removeDevice = (userId, endpoint) => {
  const row = findRow(`push:${userId}`);
  if (!row) return 0;
  const devices = (row.devices || []).filter((d) => d.endpoint !== endpoint);
  putRow({ ...row, devices });
  return devices.length;
};

/** Send one message to every device of a user. Dead devices (410/404) are removed. */
const sendToUser = async (userId, payload) => {
  const devices = devicesOf(userId);
  if (!devices.length) return { sent: 0, devices: 0 };
  getKeys();
  const body = JSON.stringify({
    title: String(payload.title || 'Travel-Trade CRM').slice(0, 120),
    body: String(payload.body || '').slice(0, 300),
    tab: payload.tab || '',
    tag: payload.tag || '',
  });
  let sent = 0;
  const dead = [];
  for (const d of devices) {
    try {
      await webpush.sendNotification({ endpoint: d.endpoint, keys: d.keys }, body, { TTL: 6 * 3600, urgency: 'high', timeout: 15000 });
      sent += 1;
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.push(d.endpoint);
      else console.warn('[Push]', e.statusCode || '', (e.body || e.message || '').toString().slice(0, 160));
    }
  }
  if (dead.length) {
    const row = findRow(`push:${userId}`);
    if (row) putRow({ ...row, devices: (row.devices || []).filter((d) => !dead.includes(d.endpoint)) });
  }
  return { sent, devices: devices.length };
};

// ---------- what is due ----------
/** Messages due now for one user, each with a key so it is sent only once. */
const dueFor = (user, now = Date.now()) => {
  const uid = user.id;
  const out = [];
  const add = (key, at, msg) => {
    if (at === null) return;
    if (at <= now && now - at <= LATE_MS) out.push({ key, ...msg });
  };
  // Leads with a follow-up date + time
  for (const l of dataStore.leads) {
    if (l.assigned_to !== uid || FINAL_STAGES.includes(String(l.stage || '').toLowerCase())) continue;
    const day = dayOf(l.follow_up_date);
    const time = timeOf(l.follow_up_time);
    if (!day || !time) continue;
    const at = localDateTime(day, time);
    add(`lead:${l.id}:${day}T${time}`, at ? at.getTime() : null, {
      title: `Follow-up now: ${l.company_name || l.name || 'a buyer'}`,
      body: [l.next_follow_up_action, l.contact_person].filter(Boolean).join(' · ') || 'Time to call this buyer.',
      tab: 'followup', tag: `lead-${l.id}`,
    });
  }
  // Follow-ups scheduled from the Follow up page
  for (const f of dataStore.followUps) {
    if (f.assigned_to !== uid || !OPEN_FU.includes(f.status)) continue;
    const day = dayOf(f.scheduled_date || f.date);
    const time = timeOf(f.scheduled_time || f.time);
    if (!day || !time) continue;
    const at = localDateTime(day, time);
    add(`fu:${f.id}:${day}T${time}`, at ? at.getTime() : null, {
      title: `Follow-up now: ${f.client_name || f.lead_name || 'a buyer'}`,
      body: f.agenda || 'Time for this follow-up.',
      tab: 'followup', tag: `fu-${f.id}`,
    });
  }
  // Tasks with a deadline time
  for (const t of dataStore.tasks) {
    if (t.assigned_to !== uid || t.status === 'Completed' || t.status === 'Cancelled') continue;
    const day = dayOf(t.due_date);
    const time = timeOf(t.deadline_time || t.due_time);
    if (!day || !time) continue;
    const at = localDateTime(day, time);
    add(`task:${t.id}:${day}T${time}`, at ? at.getTime() : null, {
      title: `Task due now: ${t.title || 'task'}`,
      body: t.priority ? `${t.priority} priority` : 'Open Task Management to update it.',
      tab: 'tasks', tag: `task-${t.id}`,
    });
  }
  // Only things that happen after the first device was added (no flood of old items)
  const since = Date.parse(findRow(`push:${uid}`)?.devices?.slice(-1)[0]?.added_at || '') || 0;
  // A new task someone else gave this person
  for (const t of dataStore.tasks) {
    if (t.assigned_to !== uid || t.created_by === uid || t.status === 'Completed' || t.status === 'Cancelled') continue;
    const at = Date.parse(t.created_at || '');
    if (!Number.isFinite(at) || at < since) continue;
    add(`newtask:${t.id}`, at, {
      title: `New task: ${t.title || 'task'}`,
      body: [t.created_by_name && `From ${t.created_by_name}`, dayOf(t.due_date) && `due ${dayOf(t.due_date)}`].filter(Boolean).join(' · ') || 'Open Task Management.',
      tab: 'tasks', tag: `newtask-${t.id}`,
    });
  }
  // New bell notifications for this person
  for (const n of dataStore.notifications || []) {
    if (n.target_user_id !== uid) continue;
    const at = Date.parse(n.created_at || '');
    if (!Number.isFinite(at) || at < since) continue;
    add(`bell:${n.id}`, at, { title: n.title || 'Travel-Trade CRM', body: n.message || n.body || '', tab: n.tab || '', tag: `bell-${n.id}` });
  }
  // Morning summary
  const today = todayISO();
  const hour = Number(process.env.PUSH_MORNING_HOUR) || 9;
  if (businessHourNow() >= hour && businessHourNow() < hour + 3) {
    const open = (l) => !FINAL_STAGES.includes(String(l.stage || '').toLowerCase());
    const leadsToday = dataStore.leads.filter((l) => l.assigned_to === uid && open(l) && dayOf(l.follow_up_date) === today).length;
    const leadsLate = dataStore.leads.filter((l) => l.assigned_to === uid && open(l) && dayOf(l.follow_up_date) && dayOf(l.follow_up_date) < today).length;
    const tasksOpen = dataStore.tasks.filter((t) => t.assigned_to === uid && t.status !== 'Completed' && t.status !== 'Cancelled' && dayOf(t.due_date) && dayOf(t.due_date) <= today).length;
    if (leadsToday + leadsLate + tasksOpen > 0) {
      const parts = [];
      if (leadsToday) parts.push(`${leadsToday} follow-up${leadsToday > 1 ? 's' : ''} today`);
      if (leadsLate) parts.push(`${leadsLate} overdue`);
      if (tasksOpen) parts.push(`${tasksOpen} task${tasksOpen > 1 ? 's' : ''} due`);
      out.push({ key: `morning:${today}`, title: 'Good morning! Your day in the CRM', body: `${parts.join(', ')}.`, tab: 'followup', tag: 'morning' });
    }
  }
  return out;
};

/** One pass: send what is due to everyone who has a device. */
const tick = async (now = Date.now()) => {
  const rows = settingsList().filter((s) => s.kind === 'push_devices' && (s.devices || []).length);
  let total = 0;
  for (const row of rows) {
    const user = dataStore.users.find((u) => u.id === row.user_id);
    if (!user || user.is_active === false) continue;
    const already = new Set(row.sent || []);
    const due = dueFor(user, now).filter((m) => !already.has(m.key));
    if (!due.length) continue;
    // Remember first, so a slow send can never repeat
    const fresh = findRow(row.id) || row;
    putRow({ ...fresh, sent: [...due.map((m) => m.key), ...(fresh.sent || [])].slice(0, MAX_SENT) });
    // Many at once (e.g. after a long sleep): one summary instead of a flood
    const list = due.length > 3
      ? [{ title: `${due.length} reminders in the CRM`, body: due.slice(0, 3).map((m) => m.title).join(' · '), tab: 'followup', tag: 'many' }]
      : due;
    for (const m of list) total += (await sendToUser(user.id, m)).sent;
  }
  return total;
};

let timer = null;
const startPushScheduler = (everyMs = Number(process.env.PUSH_TICK_MS) || 60000) => {
  if (timer) return;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await tick(); } catch (e) { console.warn('[Push]', e.message); } finally { running = false; }
  };
  timer = setInterval(run, everyMs);
  if (timer.unref) timer.unref();
};

module.exports = { getKeys, addDevice, removeDevice, devicesOf, sendToUser, dueFor, tick, startPushScheduler };
