/**
 * Push reminders: what is due, when, and only once. No network: sending is replaced by a recorder.
 *   node src/scripts/push-test.js
 */
process.env.DISABLE_SNAPSHOT = '1';
process.env.KEEPALIVE_DISABLED = 'true';
const webpush = require('web-push');
const { dataStore } = require('../repositories/dataStore');
const { localDateTime, todayISO } = require('../utils/access');

const sentLog = [];
webpush.sendNotification = async (sub, body) => { sentLog.push({ endpoint: sub.endpoint, ...JSON.parse(body) }); return { statusCode: 201 }; };
const push = require('../services/push.service');

let pass = 0; let fail = 0;
const check = (id, name, ok, got) => { if (ok) pass += 1; else fail += 1; console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${ok ? '' : ` -> ${JSON.stringify(got)}`}`); };
const hm = (ms) => new Date(ms + 330 * 60000).toISOString().slice(11, 16);
const dayAt = (ms) => new Date(ms + 330 * 60000).toISOString().slice(0, 10);

(async () => {
  const keys = push.getKeys();
  check('P-01', 'VAPID keys made once and kept (private key encrypted)', Boolean(keys.publicKey) && push.getKeys().publicKey === keys.publicKey
    && !JSON.stringify(dataStore.appSettings.find((s) => s.id === 'push:vapid')).includes(keys.privateKey), null);

  const u = { id: 'usr_push_a', name: 'Priya', role: 'staff', is_active: true };
  const other = { id: 'usr_push_b', name: 'Arjun', role: 'staff', is_active: true };
  dataStore.users.push(u, other);
  const bad = push.addDevice(u.id, { endpoint: 'http://not-https.example/x', keys: { p256dh: 'x', auth: 'y' } });
  check('P-02', 'An invalid subscription is refused', bad === null, bad);
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/demo-device-1', keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) } };
  check('P-03', 'A device is saved (and the same device only once)', push.addDevice(u.id, sub, 'Android · Chrome') === 1 && push.addDevice(u.id, sub) === 1, push.devicesOf(u.id));

  // Things become due after the device was added
  await new Promise((r) => setTimeout(r, 5));
  const now = Date.now();
  const past = now - 60 * 1000; // due one minute ago
  const later = now + 60 * 60 * 1000;
  dataStore.leads.push(
    { id: 'lead_due', company_name: 'Saigon Feed Mill', assigned_to: u.id, stage: 'Quotation Sent', follow_up_date: dayAt(past), follow_up_time: hm(past), next_follow_up_action: 'Send CIF price', contact_person: 'Tran' },
    { id: 'lead_later', company_name: 'Later Co', assigned_to: u.id, stage: 'Lead Generation', follow_up_date: dayAt(later), follow_up_time: hm(later) },
    { id: 'lead_other', company_name: 'Other Person Co', assigned_to: other.id, stage: 'Lead Generation', follow_up_date: dayAt(past), follow_up_time: hm(past) },
    { id: 'lead_won', company_name: 'Won Co', assigned_to: u.id, stage: 'Closed Won', follow_up_date: dayAt(past), follow_up_time: hm(past) },
    { id: 'lead_old', company_name: 'Old Co', assigned_to: u.id, stage: 'Lead Generation', follow_up_date: dayAt(now - 5 * 3600e3), follow_up_time: hm(now - 5 * 3600e3) },
  );
  dataStore.tasks.push({ id: 'task_due', title: 'Book container', assigned_to: u.id, created_by: 'usr_owner', created_by_name: 'Rahul', status: 'Pending', due_date: dayAt(past), deadline_time: hm(past), created_at: new Date(now).toISOString() });
  dataStore.notifications.unshift({ id: 'notif_1', target_user_id: u.id, title: 'Ticket answered', message: 'Support replied to your ticket.', created_at: new Date(now).toISOString() });

  const due = push.dueFor(u, now).map((m) => m.key);
  check('P-04', 'Follow-up whose time has come is due', due.some((k) => k.startsWith('lead:lead_due:')), due);
  check('P-05', 'Not due: later time, other person, closed deal, more than 2 h late', !due.some((k) => /lead_later|lead_other|lead_won|lead_old/.test(k)), due);
  check('P-06', 'Task deadline + new task from the owner + bell notification are due', due.some((k) => k.startsWith('task:task_due')) && due.includes('newtask:task_due') && due.includes('bell:notif_1'), due);

  sentLog.length = 0;
  const first = await push.tick(now);
  const titles = sentLog.map((s) => s.title);
  check('P-07', 'Many due at once -> one summary instead of a flood', first === 1 && /reminders in the CRM/.test(titles[0] || ''), titles);
  sentLog.length = 0;
  const again = await push.tick(now + 60000);
  check('P-08', 'Nothing is sent twice', again === 0 && sentLog.length === 0, sentLog);

  // A single new reminder is sent as itself, with the section to open
  const soon = Date.now();
  dataStore.leads.push({ id: 'lead_new', company_name: 'Lagos Grain', assigned_to: u.id, stage: 'Lead Generation', follow_up_date: dayAt(soon), follow_up_time: hm(soon), next_follow_up_action: 'Call Chidi' });
  sentLog.length = 0;
  await push.tick(soon + 61000);
  check('P-09', 'One reminder: its own title, body and section', sentLog.length === 1 && sentLog[0].title === 'Follow-up now: Lagos Grain' && sentLog[0].body === 'Call Chidi' && sentLog[0].tab === 'followup', sentLog);

  // A device the browser threw away (410) is removed
  webpush.sendNotification = async () => { const e = new Error('gone'); e.statusCode = 410; throw e; };
  const r = await push.sendToUser(u.id, { title: 'x' });
  check('P-10', 'A dead device (410) is removed', r.sent === 0 && push.devicesOf(u.id).length === 0, push.devicesOf(u.id));

  console.log(`\n${pass} passed, ${fail} failed (today ${todayISO()}, ${localDateTime(todayISO(), '09:00').toISOString()})`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
