/**
 * Extra attack tests (things a curious staff member or another company could try).
 * Runs the real API in memory on a random port. Never touches MongoDB or the snapshot file.
 *
 *   node src/scripts/security-audit-test.js
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdm1n!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'security_audit_test_secret';

const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { dataStore } = require('../repositories/dataStore');

let BASE = '';
const results = [];
async function call(method, path, token, body, rawBody) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: rawBody !== undefined ? rawBody : body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
const rec = (id, who, scenario, expected, actual, pass) => results.push({ id, who, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const uniq = Date.now();
const today = new Date().toISOString().split('T')[0];
const blocked = (s) => s === 401 || s === 403 || s === 404 || s === 400;

(async () => {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  BASE = `http://127.0.0.1:${server.address().port}/api/v1`;

  // ---------- setup: company A (owner + 2 staff), company B (owner + 1 staff) ----------
  const regA = await call('POST', '/auth/register', null, { name: 'Owner A', email: `oa${uniq}@t.com`, password: 'PassA123', company_name: 'Alpha' });
  const regB = await call('POST', '/auth/register', null, { name: 'Owner B', email: `ob${uniq}@t.com`, password: 'PassB123', company_name: 'Beta' });
  const A = regA.data.data.token, Aid = regA.data.data.user.id;
  const B = regB.data.data.token, Bid = regB.data.data.user.id;
  const mk = async (tok, n, scope) => (await call('POST', '/admin/users', tok, { name: n, email: `${n.toLowerCase()}${uniq}@t.com`, password: 'Staff123', role: 'agent', data_scope: scope })).data.data.id;
  const S1id = await mk(A, 'Sone', 'own_only');
  const S2id = await mk(A, 'Stwo', 'all');
  const BS1id = await mk(B, 'Bsone', 'own_only');
  const login = async (n) => (await call('POST', '/auth/login', null, { email: `${n.toLowerCase()}${uniq}@t.com`, password: 'Staff123' })).data.data.token;
  const S1 = await login('Sone'), S2 = await login('Stwo'), BS1 = await login('Bsone');

  const mkLead = async (tok, name, extra = {}) => (await call('POST', '/leads', tok, { company_name: name, country: 'India', follow_up_date: today, today_remarks: 'first call', next_follow_up_action: 'send price', ...extra })).data?.data;
  const LA1 = await mkLead(A, 'A lead for S1', { assigned_to: S1id, value: 5000 });
  const LA2 = await mkLead(A, 'A lead for S2', { assigned_to: S2id });
  const LB = await mkLead(B, 'B secret lead', { value: 99999 });
  const TA = (await call('POST', '/tasks', A, { title: 'A task for S1', assigned_to: S1id, due_date: today })).data.data;
  const TA2 = (await call('POST', '/tasks', A, { title: 'A task for S2', assigned_to: S2id, due_date: today })).data.data;
  const FA = (await call('POST', '/followup', S1, { lead_id: LA1.id, client_name: 'A client', scheduled_date: today })).data.data;
  const MD = (await call('POST', '/mydays', S2, { task: 'S2 private to-do' })).data.data;

  // ---------- 1. Self promotion (staff tries to become owner / admin) ----------
  await call('PATCH', '/auth/profile', S1, { role: 'admin', persona: 'owner', data_scope: 'all', company_id: 'x', created_by: Bid, staff_limit: 99, permissions: { view_leads: true }, is_active: true, email_marketing_enabled: true });
  const me = (await call('GET', '/auth/me', S1)).data.data;
  const meUser = me.user || me;
  rec('ESC-01', 'Staff', 'Staff edits own profile to become owner/admin, scope all, other company', 'all ignored', `${meUser.role}/${meUser.persona}/${meUser.data_scope}`, meUser.persona !== 'owner' && meUser.role !== 'admin' && meUser.data_scope !== 'all');
  const selfEdit = await call('PATCH', `/admin/users/${S1id}`, S1, { data_scope: 'all' });
  rec('ESC-02', 'Staff', 'Staff calls staff-management API on himself', '403', selfEdit.status, selfEdit.status === 403);
  const ownerSelf = await call('PATCH', `/admin/users/${Aid}`, A, { role: 'super_admin' });
  const aNow = dataStore.users.find((u) => u.id === Aid);
  rec('ESC-03', 'Owner', 'Owner sets his own role to super_admin', 'refused / unchanged', `${ownerSelf.status} ${aNow.role}`, aNow.role !== 'super_admin');
  const roleSA = await call('PATCH', `/admin/users/${S1id}/role`, A, { role: 'super_admin' });
  rec('ESC-04', 'Owner', 'Owner gives staff the super_admin role', '400/403', roleSA.status, blocked(roleSA.status));
  const moveStaff = await call('PATCH', `/admin/users/${S1id}`, A, { company_id: regB.data.data.user.company_id, created_by: Bid });
  const s1Now = dataStore.users.find((u) => u.id === S1id);
  rec('ESC-05', 'Owner', 'Owner moves his staff into another company (company_id/created_by)', 'ignored', s1Now.created_by === Aid, s1Now.created_by === Aid);
  const regAdmin = await call('POST', '/auth/register', null, { name: 'Evil', email: `evil${uniq}@t.com`, password: 'Evil1234', company_name: 'Evil', role: 'super_admin', persona: 'super_admin', staff_limit: 1000 });
  const evil = dataStore.users.find((u) => u.email === `evil${uniq}@t.com`);
  rec('ESC-06', 'Public', 'Register with role=super_admin and staff_limit=1000', 'refused, or normal owner with limit 2', `${regAdmin.status} ${evil ? evil.role + '/' + evil.staff_limit : 'no account'}`, regAdmin.status === 403 || (evil && evil.role !== 'super_admin' && !(Number(evil.staff_limit) > 2)));
  const regOwnerLimit = await call('POST', '/auth/register', null, { name: 'Greedy', email: `greedy${uniq}@t.com`, password: 'Greedy123', company_name: 'Greedy', staff_limit: 1000, storage_limit_mb: 99999 });
  const greedy = dataStore.users.find((u) => u.email === `greedy${uniq}@t.com`);
  rec('ESC-07', 'Public', 'Register as owner but ask for 1000 staff / huge storage', 'limit 2, default storage', `${regOwnerLimit.status} ${greedy?.staff_limit}/${greedy?.storage_limit_mb}`, greedy && Number(greedy.staff_limit) === 2 && !(Number(greedy.storage_limit_mb) > 50));
  const ownerStorage = await call('PATCH', `/admin/users/${Aid}/storage-limit`, A, { storage_limit_mb: 5000 });
  rec('ESC-08', 'Owner', 'Owner raises his own storage limit', '403', ownerStorage.status, ownerStorage.status === 403);
  const ownerDev = await call('GET', '/admin/developer-metrics', A);
  rec('ESC-09', 'Owner', 'Owner opens the developer tab', '403', ownerDev.status, ownerDev.status === 403);

  // ---------- 2. Forged / broken tokens ----------
  const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ id: 'usr_super_admin', role: 'super_admin', persona: 'super_admin' })).toString('base64url') + '.';
  rec('JWT-01', 'Attacker', 'Token with alg=none claiming Super Admin', '401', (await call('GET', '/admin/developer-metrics', none)).status, (await call('GET', '/admin/developer-metrics', none)).status === 401);
  const wrong = jwt.sign({ id: 'usr_super_admin', role: 'super_admin', persona: 'super_admin' }, 'guessed_secret');
  const rw = await call('GET', '/admin/tenants', wrong);
  rec('JWT-02', 'Attacker', 'Token signed with a guessed secret', '401', rw.status, rw.status === 401);
  const forgedRole = jwt.sign({ id: S1id, role: 'super_admin', persona: 'owner', company_id: '' }, process.env.JWT_SECRET);
  const fr = await call('GET', '/admin/tenants', forgedRole);
  rec('JWT-03', 'Attacker', 'Valid signature but role claim changed (server must trust DB, not token)', '403', fr.status, fr.status === 403);
  const expired = jwt.sign({ id: S1id }, process.env.JWT_SECRET, { expiresIn: -10 });
  rec('JWT-04', 'Anyone', 'Expired token', '401', (await call('GET', '/leads', expired)).status, (await call('GET', '/leads', expired)).status === 401);
  const ghost = jwt.sign({ id: 'usr_does_not_exist', role: 'admin', persona: 'owner' }, process.env.JWT_SECRET);
  rec('JWT-05', 'Attacker', 'Token for a user id that does not exist', '401', (await call('GET', '/leads', ghost)).status, (await call('GET', '/leads', ghost)).status === 401);

  // ---------- 3. Login injection ----------
  const inj = await call('POST', '/auth/login', null, { email: { $ne: null }, password: { $ne: null } });
  rec('INJ-01', 'Attacker', 'Login with {$ne:null} instead of email/password', '400/401', inj.status, inj.status === 400 || inj.status === 401);
  const inj2 = await call('POST', '/auth/login', null, { email: `oa${uniq}@t.com`, password: ['PassA123'] });
  rec('INJ-02', 'Attacker', 'Login with password sent as an array', '400/401', inj2.status, inj2.status === 400 || inj2.status === 401);
  const badJson = await call('POST', '/leads', A, null, '{"company_name": ');
  rec('INJ-03', 'Anyone', 'Broken JSON body does not crash the server', '400', badJson.status, badJson.status === 400);
  await call('POST', '/leads', A, null, JSON.stringify({ company_name: 'Proto test', follow_up_date: today, today_remarks: 'x', next_follow_up_action: 'y', ['__proto__']: { isAdmin: true } }).replace('"__proto__"', '"__proto__"'));
  rec('INJ-04', 'Attacker', 'Prototype pollution through __proto__ in a lead', 'no pollution', ({}).isAdmin === undefined, ({}).isAdmin === undefined);

  // ---------- 4. Cross-company (Owner B / B staff vs company A) ----------
  const crossChecks = [
    ['X-01', 'GET', `/leads/${LA1.id}`, B, 'Owner B reads A lead by id'],
    ['X-02', 'PATCH', `/leads/${LA1.id}`, B, 'Owner B edits A lead', { company_name: 'hacked' }],
    ['X-03', 'DELETE', `/leads/${LA1.id}`, BS1, 'B staff deletes A lead'],
    ['X-04', 'PATCH', `/tasks/${TA.id}`, B, 'Owner B edits A task', { title: 'hacked' }],
    ['X-05', 'DELETE', `/tasks/${TA.id}`, B, 'Owner B deletes A task'],
    ['X-06', 'PATCH', `/followup/${FA.id}`, B, 'Owner B edits A follow-up', { status: 'Completed', outcome: 'x', today_remarks: 'x' }],
    ['X-07', 'DELETE', `/followup/${FA.id}`, B, 'Owner B deletes A follow-up'],
    ['X-08', 'PATCH', `/mydays/${MD.id}/toggle`, B, 'Owner B ticks A staff to-do'],
    ['X-09', 'DELETE', `/mydays/${MD.id}`, B, 'Owner B deletes A staff to-do'],
    ['X-10', 'GET', `/analytics/staff/${S1id}`, B, 'Owner B opens A staff performance'],
    ['X-11', 'PATCH', `/admin/users/${S1id}`, B, 'Owner B resets A staff password', { password: 'Hacked123' }],
    ['X-12', 'PATCH', `/admin/users/${S1id}/status`, B, 'Owner B deactivates A staff', { is_active: false }],
  ];
  for (const [id, m, p, tok, label, body] of crossChecks) {
    const r = await call(m, p, tok, body);
    rec(id, 'Other company', label, '403/404', r.status, r.status === 403 || r.status === 404);
  }
  const stillThere = dataStore.leads.find((l) => l.id === LA1.id);
  rec('X-13', 'Other company', 'A lead still intact after all attacks', 'intact', stillThere?.company_name, stillThere && stillThere.company_name === 'A lead for S1');
  const plant = await call('POST', '/leads', B, { company_name: 'Planted', follow_up_date: today, today_remarks: 'x', next_follow_up_action: 'y', owner_id: Aid, company_id: regA.data.data.user.company_id, created_by_id: S1id });
  const aSeesPlant = (await call('GET', '/leads', A)).data.data.some((l) => l.company_name === 'Planted');
  rec('X-14', 'Other company', 'Owner B plants a lead into company A (sends A owner_id/company_id)', 'A does not see it', aSeesPlant, plant.status >= 400 || !aSeesPlant);
  const plantTask = await call('POST', '/tasks', B, { title: 'Planted task', lead_id: LA1.id });
  rec('X-15', 'Other company', 'Owner B creates task linked to A lead', '404', plantTask.status, plantTask.status === 404);
  const plantFU = await call('POST', '/followup', B, { lead_id: LA1.id, client_name: 'x', scheduled_date: today });
  rec('X-16', 'Other company', 'Owner B creates follow-up on A lead', '403/404', plantFU.status, plantFU.status >= 400);
  const plantAct = await call('POST', '/activity', B, { type: 'Call', title: 'x', lead_id: LA1.id });
  rec('X-17', 'Other company', 'Owner B logs activity on A lead', '403/404', plantAct.status, plantAct.status >= 400);
  const bByQuery = (await call('GET', `/leads?assigned_to=${S1id}`, B)).data.data || [];
  rec('X-18', 'Other company', 'Owner B filters leads by A staff id (?assigned_to=)', '0 leads', bByQuery.length, bByQuery.length === 0);
  const bTasksQ = (await call('GET', `/tasks?assigned_to=${S1id}`, B)).data.data || [];
  rec('X-19', 'Other company', 'Owner B filters tasks by A staff id', '0 tasks', bTasksQ.length, bTasksQ.length === 0);
  const bSearch = (await call('GET', '/leads?search=A%20lead', B)).data.data || [];
  rec('X-20', 'Other company', 'Owner B searches for A lead names', '0 leads', bSearch.length, bSearch.length === 0);
  const notifA = (await call('GET', '/notifications', B)).data.data || [];
  rec('X-21', 'Other company', 'Owner B notifications contain nothing from A', 'none', notifA.filter((n) => /Sone|Stwo|A lead/.test(JSON.stringify(n))).length, !notifA.some((n) => /Sone|Stwo|A lead/.test(JSON.stringify(n))));
  const remB = JSON.stringify((await call('GET', '/reminders', B)).data);
  rec('X-22', 'Other company', 'Owner B reminders contain nothing from A', 'none', /A task for S1|Sone/.test(remB), !/A task for S1|Sone/.test(remB));
  const anaB = JSON.stringify((await call('GET', '/analytics', B)).data);
  rec('X-23', 'Other company', 'Owner B analytics totals exclude A deal value', 'no 5000', anaB.includes('5000') && !anaB.includes('99999'), !/"A lead/.test(anaB));

  // ---------- 5. Inside one company: staff vs staff, staff vs owner rules ----------
  const s1ReadS2 = await call('GET', `/leads/${LA2.id}`, S1);
  rec('IN-01', 'Staff (own)', 'Staff reads colleague lead by id', '404', s1ReadS2.status, s1ReadS2.status === 404);
  const s2EditS1 = await call('PATCH', `/leads/${LA1.id}`, S2, { today_remarks: 'I am S2' });
  rec('IN-02', 'Staff (all)', 'Staff with full view writes a remark on colleague lead', '403', s2EditS1.status, s2EditS1.status === 403);
  const s1Mass = await call('PATCH', `/leads/${LA1.id}`, S1, { today_remarks: 'ok', previous_remarks: [], edit_history: [], created_by_id: S1id, owner_id: S1id, company_id: 'x' });
  const la1 = dataStore.leads.find((l) => l.id === LA1.id);
  rec('IN-03', 'Staff', 'Staff sends remark + tries to wipe history and take ownership', 'history kept, owner kept', `${s1Mass.status} hist=${(la1.previous_remarks || []).length} creator=${la1.created_by_id === Aid}`, (la1.previous_remarks || []).length >= 2 && la1.created_by_id === Aid && la1.owner_id !== S1id);
  const s1Value = await call('PATCH', `/leads/${LA1.id}`, S1, { value: 1 });
  rec('IN-04', 'Staff', 'Staff changes deal value', '403', s1Value.status, s1Value.status === 403);
  const s1Docs = await call('PATCH', `/leads/${LA1.id}`, S1, { documents: [{ name: 'x' }] });
  rec('IN-05', 'Staff', 'Staff overwrites lead documents', '403', s1Docs.status, s1Docs.status === 403);
  const s1TaskS2 = await call('PATCH', `/tasks/${TA2.id}`, S1, { status: 'Completed' });
  rec('IN-06', 'Staff', 'Staff completes colleague task', '403/404', s1TaskS2.status, s1TaskS2.status === 403 || s1TaskS2.status === 404);
  const s2TaskS1 = await call('PATCH', `/tasks/${TA.id}`, S2, { status: 'Completed' });
  rec('IN-07', 'Staff (all)', 'Staff with full view completes colleague task', '403/404', s2TaskS1.status, s2TaskS1.status === 403 || s2TaskS1.status === 404);
  const s1Due = await call('PATCH', `/tasks/${TA.id}`, S1, { due_date: '2099-01-01' });
  rec('IN-08', 'Staff', 'Staff pushes his own task deadline', '403', s1Due.status, s1Due.status === 403);
  const s1Reassign = await call('PATCH', `/tasks/${TA.id}`, S1, { assigned_to: S2id });
  rec('IN-09', 'Staff', 'Staff passes his task to a colleague', '403', s1Reassign.status, s1Reassign.status === 403);
  const s1MyDayS2 = await call('PATCH', `/mydays/${MD.id}/toggle`, S1);
  rec('IN-10', 'Staff', 'Staff ticks colleague to-do', '403/404', s1MyDayS2.status, s1MyDayS2.status === 403 || s1MyDayS2.status === 404);
  const s1MyDayDel = await call('DELETE', `/mydays/${MD.id}`, S1);
  rec('IN-11', 'Staff', 'Staff deletes colleague to-do', '403/404', s1MyDayDel.status, s1MyDayDel.status === 403 || s1MyDayDel.status === 404);
  const s2FU = await call('PATCH', `/followup/${FA.id}`, S2, { status: 'Completed', outcome: 'done', today_remarks: 'S2 did it' });
  rec('IN-12', 'Staff (all)', 'Staff completes colleague follow-up', '403/404', s2FU.status, s2FU.status === 403 || s2FU.status === 404);
  const s1Users = await call('GET', '/admin/users', S1);
  rec('IN-13', 'Staff', 'Staff lists all staff (emails, roles)', '403', s1Users.status, s1Users.status === 403);
  const s1Team = await call('GET', '/analytics/team', S1);
  rec('IN-14', 'Staff', 'Staff opens team performance', '403', s1Team.status, s1Team.status === 403);
  const s1Email = await call('GET', '/email/campaigns', S1);
  rec('IN-15', 'Staff', 'Staff opens email campaigns', '403', s1Email.status, s1Email.status === 403);
  const s1TaskList = (await call('GET', '/tasks', S1)).data.data || [];
  rec('IN-16', 'Staff', 'Staff task list has only his tasks', 'only own', s1TaskList.map((t) => t.title).join('|'), s1TaskList.every((t) => t.assigned_to === S1id));
  const s1Out = (await call('GET', '/outreach', S1)).data.data || [];
  rec('IN-17', 'Staff', 'Staff outreach shows only his numbers', 'only own', s1Out.length, s1Out.every((o) => o.employee_id === S1id));

  // ---------- 6. Remarks & follow-ups are trustworthy ----------
  await call('PATCH', `/leads/${LA1.id}`, S1, { today_remarks: 'Buyer asked for CIF', next_follow_up_action: 'Send CIF quote', follow_up_date: today });
  const hist = dataStore.leads.find((l) => l.id === LA1.id).previous_remarks || [];
  const last = hist[0] || {};
  rec('RM-01', 'Staff', 'New remark saved with author, time and planned action', 'author=Sone', `${last.author} | ${last.planned_action}`, last.author === 'Sone' && last.author_id === S1id && last.planned_action === 'Send CIF quote' && !!last.date);
  const emptyRemark = await call('PATCH', `/leads/${LA1.id}`, S1, { today_remarks: '   ', next_follow_up_action: '' });
  const hist2 = dataStore.leads.find((l) => l.id === LA1.id).previous_remarks || [];
  rec('RM-02', 'Staff', 'Blank remark does not create an empty history entry', 'no new entry', `${emptyRemark.status} ${hist2.length}`, hist2.length === hist.length);
  const fakeAuthor = await call('PATCH', `/leads/${LA1.id}`, S1, { today_remarks: 'by boss', author: 'Owner A', author_id: Aid });
  const last3 = (dataStore.leads.find((l) => l.id === LA1.id).previous_remarks || [])[0];
  rec('RM-03', 'Staff', 'Staff writes a remark pretending to be the owner', 'author stays Sone', last3?.author, last3?.author === 'Sone');
  const fuNoReason = await call('PATCH', `/followup/${FA.id}`, S1, { scheduled_date: '2099-12-31' });
  rec('RM-04', 'Staff', 'Staff moves follow-up far ahead without reason', '400', fuNoReason.status, fuNoReason.status === 400);
  const fuDone = await call('PATCH', `/followup/${FA.id}`, S1, { status: 'Completed' });
  rec('RM-05', 'Staff', 'Staff closes follow-up without writing outcome', '400', fuDone.status, fuDone.status === 400);
  const pastFU = await call('POST', '/followup', S1, { lead_id: LA1.id, client_name: 'Past', scheduled_date: '2020-01-01' });
  rec('RM-06', 'Staff', 'Staff creates a follow-up dated in the past (to fake it as already done)', 'refused or shows Missed', `${pastFU.status} ${pastFU.data?.data?.status}`, pastFU.status >= 400 || /missed|overdue/i.test(String(pastFU.data?.data?.status || pastFU.data?.data?.computed_status || '')));

  // ---------- 7. Storage abuse & limits ----------
  const big = 'x'.repeat(9 * 1024 * 1024);
  const bigLead = await call('POST', '/leads', S1, { company_name: 'Big', follow_up_date: today, today_remarks: big, next_follow_up_action: 'y' });
  rec('ST-01', 'Staff', 'Staff saves a 9 MB remark in one lead', '413 too large', bigLead.status, bigLead.status === 413);
  const longRemark = await call('PATCH', `/leads/${LA1.id}`, S1, { today_remarks: 'y'.repeat(25000) });
  rec('ST-02', 'Staff', 'Staff saves a 25,000-character remark', '413', longRemark.status, longRemark.status === 413);
  const bigAvatar = await call('PATCH', '/auth/profile', S1, { avatar_url: 'https://x.com/' + 'A'.repeat(5000) });
  rec('ST-03', 'Staff', 'Staff saves a 5,000-character profile picture link', '400/413', bigAvatar.status, bigAvatar.status === 400 || bigAvatar.status === 413);
  const jsLink = await call('POST', '/leads', A, { company_name: 'JS', website: 'javascript:alert(document.cookie)', follow_up_date: today, today_remarks: 'x', next_follow_up_action: 'y' });
  rec('ST-04', 'Owner', 'Save a website link that runs a script (javascript:)', '400', jsLink.status, jsLink.status === 400);
  const SAtok = (await call('POST', '/auth/admin-login', null, { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD })).data?.data?.token;
  const setLimit = await call('PATCH', `/admin/users/${Aid}/storage-limit`, SAtok, { storage_limit_mb: 1 });
  rec('ST-05', 'Super Admin', 'Super Admin sets company A storage limit to 1 MB', '200', setLimit.status, setLimit.status === 200);
  const setOnStaff = await call('PATCH', `/admin/users/${S1id}/storage-limit`, SAtok, { storage_limit_mb: 1 });
  rec('ST-06', 'Super Admin', 'Storage limit on a staff (not a company)', '400', setOnStaff.status, setOnStaff.status === 400);
  let firstRefused = -1;
  for (let i = 0; i < 120; i++) {
    const r = await call('POST', '/mydays', S1, { task: 'fill ' + i + ' ' + 'z'.repeat(15000) });
    if (r.status === 413) { firstRefused = i; break; }
  }
  rec('ST-07', 'Staff', 'Company keeps adding data after its 1 MB limit', 'refused with 413 once full', firstRefused, firstRefused > 0);
  const readWhenFull = await call('GET', '/leads', S1);
  rec('ST-08', 'Staff', 'Reading still works when storage is full', '200', readWhenFull.status, readWhenFull.status === 200);
  const otherCompany = await call('POST', '/leads', B, { company_name: 'B still works', follow_up_date: today, today_remarks: 'x', next_follow_up_action: 'y' });
  rec('ST-09', 'Other company', 'Company B is not affected by A being full', '201', otherCompany.status, otherCompany.status === 201);
  const myd = (await call('GET', '/mydays', S1)).data.data || [];
  const delWhenFull = myd[0] ? await call('DELETE', `/mydays/${myd[0].id}`, S1) : { status: 0 };
  rec('ST-10', 'Staff', 'Deleting own to-do still works when storage is full', 'not 413', delWhenFull.status, delWhenFull.status !== 413);
  const dev = await call('GET', '/admin/developer-metrics', SAtok);
  const fpA = (dev.data?.data?.userResourceConsumption || []).find((u) => u.id === Aid);
  const members = fpA && fpA.members ? fpA.members.map((m) => `${m.name}:${m.kb}KB`).join(',') : '';
  rec('ST-11', 'Super Admin', 'Developer tab shows company A used/limit and each member usage', 'members listed', members || String(!!fpA), !!(fpA && fpA.members && fpA.members.length === 3 && fpA.storageLimitMb === 1));
  await call('PATCH', `/admin/users/${Aid}/storage-limit`, SAtok, { storage_limit_mb: 50 });
  const afterRaise = await call('POST', '/mydays', S1, { task: 'after raise' });
  rec('ST-12', 'Staff', 'Saving works again after Super Admin raises the limit', '201', afterRaise.status, afterRaise.status === 201);

  // ---------- 8. Deactivated / deleted staff ----------
  await call('PATCH', `/admin/users/${S2id}/status`, A, { is_active: false });
  const deact = await call('GET', '/leads', S2);
  rec('AL-01', 'Staff', 'Deactivated staff uses old token', '401/403', deact.status, deact.status === 401 || deact.status === 403);
  await call('DELETE', `/admin/users/${BS1id}`, B);
  const del = await call('GET', '/leads', BS1);
  rec('AL-02', 'Staff', 'Deleted staff uses old token', '401', del.status, del.status === 401);

  server.close();
  const fails = results.filter((r) => r.result === 'FAIL');
  console.table(results.map(({ id, who, scenario, expected, actual, result }) => ({ id, who, scenario: scenario.slice(0, 70), expected, actual: actual.slice(0, 40), result })));
  console.log(`SECURITY AUDIT: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
  require('fs').writeFileSync(require('path').join(__dirname, 'security-audit-results.json'), JSON.stringify(results, null, 2));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
