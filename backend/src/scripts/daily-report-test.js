/**
 * Tests for: owner's evening report, "last contact" 7-day alert, owner storage meter.
 * Runs the API in memory (never touches MongoDB).   node src/scripts/daily-report-test.js
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdm1n!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'daily_report_test_secret';

const http = require('http');
const app = require('../app');
const { dataStore } = require('../repositories/dataStore');
const { todayISO } = require('../utils/access');
const { deliverDailyReport, startDailyReportScheduler } = require('../services/dailyReport.service');

let BASE = '';
const results = [];
const call = async (method, path, token, body) => {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
};
const rec = (id, scenario, expected, actual, pass) => results.push({ id, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const u = Date.now();
const today = todayISO();
const dayShift = (n) => new Date(new Date(`${today}T12:00:00Z`).getTime() + n * 86400000).toISOString().split('T')[0];

(async () => {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  BASE = `http://127.0.0.1:${server.address().port}/api/v1`;

  const ra = await call('POST', '/auth/register', null, { name: 'Rahul', email: `r${u}@t.com`, password: 'Owner123', company_name: 'Rahul Exports' });
  const rb = await call('POST', '/auth/register', null, { name: 'Other', email: `o${u}@t.com`, password: 'Owner123', company_name: 'Other Co' });
  const A = ra.data.data.token, Aid = ra.data.data.user.id, B = rb.data.data.token;
  const s1id = (await call('POST', '/admin/users', A, { name: 'Deepak', email: `d${u}@t.com`, password: 'Staff123' })).data.data.id;
  const s2id = (await call('POST', '/admin/users', A, { name: 'Japneet', email: `j${u}@t.com`, password: 'Staff123' })).data.data.id;
  const S1 = (await call('POST', '/auth/login', null, { email: `d${u}@t.com`, password: 'Staff123' })).data.data.token;
  const S2 = (await call('POST', '/auth/login', null, { email: `j${u}@t.com`, password: 'Staff123' })).data.data.token;

  // Deepak works today
  const l1 = (await call('POST', '/leads', S1, { company_name: 'Tehran Spice', follow_up_date: dayShift(2), today_remarks: 'Sent price list', next_follow_up_action: 'Call back' })).data.data;
  await call('PATCH', `/leads/${l1.id}`, S1, { today_remarks: 'Buyer wants CIF', next_follow_up_action: 'Send CIF quote' });
  await call('POST', '/activity', S1, { type: 'call', title: 'Call initiated', lead_id: l1.id });
  await call('POST', '/outreach/record', S1, { calls_made: 12, emails_sent: 4 });
  // Owner gives Japneet an old lead nobody touched for 10 days, follow-up was due yesterday
  const l2 = (await call('POST', '/leads', A, { company_name: 'Dubai Foods', assigned_to: s2id, follow_up_date: dayShift(-1), today_remarks: 'First talk', next_follow_up_action: 'Send sample' })).data.data;
  const stored = dataStore.leads.find((l) => l.id === l2.id);
  const old = new Date(Date.now() - 10 * 86400000).toISOString();
  stored.created_at = old;
  stored.previous_remarks.forEach((r) => { r.date = old; });
  // Japneet also has a follow-up scheduled yesterday that she never completed
  const fu = (await call('POST', '/followup', A, { lead_id: l2.id, client_name: 'Dubai Foods', scheduled_date: dayShift(-1), assigned_to: s2id })).data.data;
  // Other company data must never appear
  await call('POST', '/leads', B, { company_name: 'B secret buyer', follow_up_date: dayShift(-1), today_remarks: 'x', next_follow_up_action: 'y' });

  // ---------- Last contact ----------
  const leadsA = (await call('GET', '/leads', A)).data.data;
  const t = leadsA.find((l) => l.id === l1.id), d = leadsA.find((l) => l.id === l2.id);
  rec('LC-01', 'Lead with remark today shows last contact today', '0 days, no alert', `${t.days_since_contact} ${t.no_contact_alert}`, t.days_since_contact === 0 && t.no_contact_alert === false);
  rec('LC-02', 'Lead untouched for 10 days is flagged red', '10 days, alert', `${d.days_since_contact} ${d.no_contact_alert}`, d.days_since_contact === 10 && d.no_contact_alert === true);
  const only = (await call('GET', '/leads?no_contact=true', A)).data.data;
  rec('LC-03', 'Filter ?no_contact=true returns only flagged buyers', 'Dubai Foods only', only.map((l) => l.company_name).join(','), only.length === 1 && only[0].id === l2.id);
  const s2view = (await call('GET', '/leads', S2)).data.data.find((l) => l.id === l2.id);
  rec('LC-04', 'Staff sees the same red flag on her lead', 'alert', s2view?.no_contact_alert, s2view?.no_contact_alert === true);
  const backFromWhole = await call('PATCH', `/leads/${l2.id}`, S2, { ...s2view, today_remarks: 'Called, will order next week', next_follow_up_action: 'Send PI' });
  rec('LC-05', 'Staff saving the whole lead object (incl. last-contact fields) is not blocked', '200', backFromWhole.status, backFromWhole.status === 200);
  const after = (await call('GET', '/leads', A)).data.data.find((l) => l.id === l2.id);
  rec('LC-06', 'After a new remark the red flag goes away', '0 days, no alert', `${after.days_since_contact} ${after.no_contact_alert}`, after.days_since_contact === 0 && !after.no_contact_alert);
  // put it back to "old" for the report tests
  after && (dataStore.leads.find((l) => l.id === l2.id).previous_remarks = stored.previous_remarks.filter((r) => r.date === old));
  await call('PATCH', `/leads/${l2.id}`, A, { stage: 'Closed Won' });
  const won = (await call('GET', '/leads', A)).data.data.find((l) => l.id === l2.id);
  rec('LC-07', 'Won/Lost leads are never flagged', 'no alert', won.no_contact_alert, won.no_contact_alert === false);
  await call('PATCH', `/leads/${l2.id}`, A, { stage: 'Contact Established' });

  // ---------- Daily report ----------
  const rep = await call('GET', '/analytics/daily-report', A);
  const r = rep.data?.data || {};
  const dp = (r.members || []).find((m) => m.name === 'Deepak') || {};
  const jn = (r.members || []).find((m) => m.name === 'Japneet') || {};
  rec('DR-01', 'Owner opens today\'s report', '200 with 3 members', `${rep.status} ${(r.members || []).length}`, rep.status === 200 && r.members.length === 3);
  rec('DR-02', 'Deepak: calls = 12 outreach + 1 logged call', '13', dp.calls, dp.calls === 13);
  rec('DR-03', 'Deepak: remarks written today', '2', dp.remarks_written, dp.remarks_written === 2);
  rec('DR-04', 'Deepak: leads created today', '1', dp.leads_created, dp.leads_created === 1);
  rec('DR-05', 'Japneet: missed follow-ups listed with buyer name', '2 (follow-up + lead date)', `${jn.followups_missed} ${JSON.stringify(jn.missed_followups)}`, jn.followups_missed === 2 && jn.missed_followups.every((m) => m.buyer === 'Dubai Foods'));
  rec('DR-06', 'Japneet: no-contact 7+ days counted', '1', jn.no_contact_7d, jn.no_contact_7d === 1);
  rec('DR-07', 'Staff who did nothing is named', 'Japneet', (r.silent_members || []).join(','), (r.silent_members || []).includes('Japneet') && !(r.silent_members || []).includes('Deepak'));
  rec('DR-08', 'Report has nothing from another company', 'no "B secret"', JSON.stringify(r).includes('B secret'), !JSON.stringify(r).includes('B secret'));
  const staffRep = await call('GET', '/analytics/daily-report', S1);
  rec('DR-09', 'Staff opens the owner report', '403', staffRep.status, staffRep.status === 403);
  const future = await call('GET', `/analytics/daily-report?date=${dayShift(3)}`, A);
  rec('DR-10', 'Report for a future date', '400', future.status, future.status === 400);
  const y = (await call('GET', `/analytics/daily-report?date=${dayShift(-1)}`, A)).data.data;
  rec('DR-11', 'Yesterday\'s report shows yesterday\'s numbers (Deepak 0 calls)', '0', (y.members.find((m) => m.name === 'Deepak') || {}).calls, (y.members.find((m) => m.name === 'Deepak') || {}).calls === 0);
  const bRep = (await call('GET', '/analytics/daily-report', B)).data.data;
  rec('DR-12', 'Owner B report lists only his own people', 'Other', bRep.members.map((m) => m.name).join(','), bRep.members.length === 1 && bRep.members[0].name === 'Other');

  // delivery: notification + email
  const owner = dataStore.users.find((x) => x.id === Aid);
  const sent = [];
  const { notification, mail } = await deliverDailyReport(owner, today, { sendMail: async (m) => { sent.push(m); return { ok: true }; } });
  const aNotifs = (await call('GET', '/notifications', A)).data.data;
  const bNotifs = (await call('GET', '/notifications', B)).data.data;
  const s1Notifs = (await call('GET', '/notifications', S1)).data.data;
  rec('DR-13', 'Owner gets the report as a notification', 'visible', aNotifs.some((n) => n.id === notification.id), aNotifs.some((n) => n.id === notification.id));
  rec('DR-14', 'Staff and other company do not get it', 'not visible', [bNotifs, s1Notifs].some((l) => l.some((n) => n.id === notification.id)), ![bNotifs, s1Notifs].some((l) => l.some((n) => n.id === notification.id)));
  rec('DR-15', 'Email has subject, team table and missed buyer', 'ok', `${mail.ok} ${sent[0]?.subject}`, mail.ok && /Team report/.test(sent[0].subject) && sent[0].html.includes('Deepak') && sent[0].html.includes('Dubai Foods') && sent[0].to === owner.email);
  const html = sent[0].html;
  rec('DR-16', 'Names in the email are escaped (no HTML injection)', 'escaped', html.includes('<script'), !html.includes('<script'));

  // scheduler: sends once per owner per day
  dataStore.users.forEach((x) => { delete x.last_daily_report_on; });
  const mails = [];
  const before = dataStore.notifications.length;
  const sched = startDailyReportScheduler({ hour: 0, everyMs: 3600000 });
  await sched.tick();
  const firstRun = dataStore.notifications.length - before;
  await sched.tick();
  const secondRun = dataStore.notifications.length - before - firstRun;
  sched.stop();
  const ownersCount = dataStore.users.filter((x) => (x.persona === 'owner' || (x.role === 'admin' && x.persona !== 'staff')) && x.is_active !== false && x.id !== 'usr_super_admin').length;
  rec('DR-17', 'Evening job sends one report to every owner', `${ownersCount} then 0`, `${firstRun} then ${secondRun}`, firstRun === ownersCount && secondRun === 0);

  // ---------- Owner storage meter ----------
  const mine = await call('GET', '/admin/my-usage', A);
  rec('SM-01', 'Owner sees his storage used / limit', '200, limit 50', `${mine.status} ${mine.data?.data?.used_mb}/${mine.data?.data?.limit_mb}`, mine.status === 200 && mine.data.data.limit_mb === 50 && mine.data.data.used_bytes > 0);
  const staffUsage = await call('GET', '/admin/my-usage', S1);
  rec('SM-02', 'Staff cannot open the storage meter', '403', staffUsage.status, staffUsage.status === 403);
  const bUsage = (await call('GET', '/admin/my-usage', B)).data.data;
  rec('SM-03', 'Owner B sees only his own (smaller) usage', 'B < A', `${bUsage.used_bytes} < ${mine.data.data.used_bytes}`, bUsage.used_bytes < mine.data.data.used_bytes);

  server.close();
  const fails = results.filter((x) => x.result === 'FAIL');
  console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 64), actual: x.actual.slice(0, 50) })));
  console.log(`DAILY REPORT / LAST CONTACT / STORAGE: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
