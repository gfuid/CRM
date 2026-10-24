/**
 * Owner / Staff / Super Admin role scenarios (permissions, data separation, performance review, reminders).
 *
 * Runs the real API in memory on a random port. It never connects to MongoDB and never touches the
 * local snapshot file (NODE_ENV=test).
 *
 *   NODE_ENV=test JWT_SECRET=any_test_secret ADMIN_PASSWORD=SuperAdm1n! node src/scripts/role-scenarios-test.js
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdm1n!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'role_scenarios_test_secret';

const http = require('http');
const app = require('../app');

let BASE = '';
const results = [];

async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

function rec(id, area, who, scenario, expected, actual, pass, note = '') {
  results.push({ id, area, who, scenario, expected, actual, result: pass ? 'PASS' : 'FAIL', note });
}

const uniq = Date.now();
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

(async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  BASE = `http://127.0.0.1:${server.address().port}/api/v1`;

  // ---------- SETUP ----------
  const regA = await call('POST', '/auth/register', null, { name: 'Owner A', email: `ownera${uniq}@t.com`, password: 'PassA123', company_name: 'Alpha Exports' });
  const regB = await call('POST', '/auth/register', null, { name: 'Owner B', email: `ownerb${uniq}@t.com`, password: 'PassB123', company_name: 'Beta Traders' });
  const A = regA.data.data.token, Aid = regA.data.data.user.id;
  const B = regB.data.data.token, Bid = regB.data.data.user.id;
  const adm = await call('POST', '/auth/admin-login', null, { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD });
  const SA = adm.data?.data?.token;

  // ---------- STAFF MANAGEMENT ----------
  const s1 = await call('POST', '/admin/users', A, { name: 'Staff One', email: `s1${uniq}@t.com`, password: 'Staff123', role: 'agent', data_scope: 'own_only' });
  rec('ST-01', 'Staff', 'Owner', 'Owner creates staff #1', '201', s1.status, s1.status === 201);
  const s2 = await call('POST', '/admin/users', A, { name: 'Staff Two', email: `s2${uniq}@t.com`, password: 'Staff123', role: 'agent', data_scope: 'all' });
  rec('ST-02', 'Staff', 'Owner', 'Owner creates staff #2 (data scope = all)', '201', s2.status, s2.status === 201);
  const s3 = await call('POST', '/admin/users', A, { name: 'Staff Three', email: `s3${uniq}@t.com`, password: 'Staff123' });
  rec('ST-03', 'Staff', 'Owner', 'Owner tries 3rd staff when limit is 2', '403 seat limit', s3.status, s3.status === 403);
  const dup = await call('POST', '/admin/users', B, { name: 'Dup', email: `s1${uniq}@t.com`, password: 'Staff123' });
  rec('ST-04', 'Staff', 'Owner B', 'Create staff with an email already used in another company', '409', dup.status, dup.status === 409, 'Error message reveals that the email exists in another company');
  const bs1 = await call('POST', '/admin/users', B, { name: 'B Staff', email: `bs1${uniq}@t.com`, password: 'Staff123' });
  let S1id = s1.data.data.id; const S2id = s2.data.data.id, BS1id = bs1.data.data.id;
  let S1 = (await call('POST', '/auth/login', null, { email: `s1${uniq}@t.com`, password: 'Staff123' })).data.data.token;
  const S2 = (await call('POST', '/auth/login', null, { email: `s2${uniq}@t.com`, password: 'Staff123' })).data.data.token;
  const BS1 = (await call('POST', '/auth/login', null, { email: `bs1${uniq}@t.com`, password: 'Staff123' })).data.data.token;

  const listA = await call('GET', '/admin/users', A);
  const aSees = (listA.data.data || []).map((u) => u.id);
  rec('ST-05', 'Isolation', 'Owner', 'Owner A staff list shows only A staff', 'only S1,S2', aSees.join(','), aSees.length === 2 && aSees.includes(S1id) && aSees.includes(S2id) && !aSees.includes(BS1id));
  const listB = await call('GET', '/admin/users', B);
  const bSees = (listB.data.data || []).map((u) => u.id);
  rec('ST-06', 'Isolation', 'Owner B', 'Owner B cannot see A staff', 'only B staff', bSees.join(','), !bSees.includes(S1id) && !bSees.includes(S2id));
  const s1Admin = await call('GET', '/admin/users', S1);
  rec('ST-07', 'Permissions', 'Staff', 'Staff calls owner staff-management API', '403', s1Admin.status, s1Admin.status === 403);
  const bEditA = await call('PATCH', `/admin/users/${S1id}`, B, { name: 'hacked' });
  rec('ST-08', 'Isolation', 'Owner B', 'Owner B edits Owner A staff', '403', bEditA.status, bEditA.status === 403);
  const bDelA = await call('DELETE', `/admin/users/${S1id}`, B);
  rec('ST-09', 'Isolation', 'Owner B', 'Owner B deletes Owner A staff', '403', bDelA.status, bDelA.status === 403);

  // ---------- PRIVILEGE ESCALATION ----------
  const selfLimit = await call('PATCH', `/admin/users/${Aid}/staff-limit`, A, { staff_limit: 500 });
  rec('SEC-01', 'Break system', 'Owner', 'Owner raises his OWN staff limit to 500 (should be Super Admin only)', '403', selfLimit.status, selfLimit.status === 403);
  const otherLimit = await call('PATCH', `/admin/users/${Bid}/staff-limit`, A, { staff_limit: 0 });
  rec('SEC-02', 'Break system', 'Owner', 'Owner A changes Owner B staff limit to 0', '403', otherLimit.status, otherLimit.status === 403);
  const selfFeature = await call('PATCH', `/admin/users/${Aid}/features`, A, { email_marketing: true });
  rec('SEC-03', 'Break system', 'Owner', 'Owner switches ON premium Email Marketing for himself', '403', selfFeature.status, selfFeature.status === 403);
  const toggleB = await call('PATCH', `/admin/users/${BS1id}/status`, A);
  rec('SEC-04', 'Break system', 'Owner', 'Owner A deactivates Owner B\'s staff', '403', toggleB.status, toggleB.status === 403);
  if (toggleB.status === 200) await call('PATCH', `/admin/users/${BS1id}/status`, A);
  const toggleOwnerB = await call('PATCH', `/admin/users/${Bid}/status`, A);
  rec('SEC-05', 'Break system', 'Owner', 'Owner A deactivates Owner B account (locks a whole company out)', '403', toggleOwnerB.status, toggleOwnerB.status === 403);
  if (toggleOwnerB.status === 200) await call('PATCH', `/admin/users/${Bid}/status`, A);
  const audit = await call('GET', '/admin/audit-logs', A);
  const auditLeak = (audit.data?.data || []).some((l) => JSON.stringify(l).includes(`bs1${uniq}`));
  rec('SEC-06', 'Break system', 'Owner', 'Owner A reads platform audit log (contains Owner B staff emails)', '403 / only own logs', `${audit.status}, leak=${auditLeak}`, audit.status === 403 || !auditLeak);
  const bcast = await call('POST', '/admin/notifications', A, { target: 'all', title: 'Your account is suspended', message: 'Pay at evil.example to restore' });
  const bNotifs = await call('GET', '/notifications', BS1);
  const phish = (bNotifs.data?.data || []).some((n) => n.title === 'Your account is suspended');
  rec('SEC-07', 'Break system', 'Owner', 'Owner A broadcasts a fake notification to ALL users of ALL companies', '403', `${bcast.status}, B staff received=${phish}`, bcast.status === 403 && !phish);
  const ov = await call('GET', '/admin/overview-summary', A);
  const ovStr = JSON.stringify(ov.data || {});
  const hashLeak = ovStr.includes('$2a$') || ovStr.includes('$2b$');
  rec('SEC-08', 'Break system', 'Owner', 'Owner A opens platform overview (all users, password hashes)', '403', `${ov.status}, passwordHashLeak=${hashLeak}`, ov.status === 403);
  const upg = await call('POST', '/admin/subscription/upgrade', A, { planId: 'enterprise' });
  rec('SEC-09', 'Break system', 'Owner', 'Owner upgrades to Enterprise plan for free', '403 / payment required', upg.status, upg.status !== 200);
  const sett = await call('PATCH', '/admin/settings', A, { name: 'HACKED CORP' });
  rec('SEC-10', 'Break system', 'Owner', 'Owner renames the global platform company record', '403', sett.status, sett.status === 403);
  const dev = await call('GET', '/admin/developer-metrics', A);
  rec('SEC-11', 'Break system', 'Owner', 'Owner opens developer metrics / server internals', '403', dev.status, dev.status === 403);
  const ten = await call('GET', '/admin/tenants', A);
  rec('SEC-12', 'Break system', 'Owner', 'Owner lists all tenants', '403', ten.status, ten.status === 403);
  const adminNotifs = await call('GET', '/admin/notifications', A);
  rec('SEC-13', 'Break system', 'Owner', 'Owner lists/deletes Super Admin broadcast notifications', '403', adminNotifs.status, adminNotifs.status === 403);

  // promote staff to admin role
  const promote = await call('PATCH', `/admin/users/${S1id}`, A, { role: 'admin' });
  const S1p = (await call('POST', '/auth/login', null, { email: `s1${uniq}@t.com`, password: 'Staff123' })).data.data.token;
  const s1AsAdmin = await call('GET', '/admin/audit-logs', S1p);
  rec('SEC-14', 'Break system', 'Owner→Staff', 'Owner sets staff role = "admin" → staff gets platform admin API', 'role change rejected', `promote=${promote.status}, staff→/admin/audit-logs=${s1AsAdmin.status}`, promote.status !== 200 || s1AsAdmin.status === 403);
  const demoteO = await call('PATCH', `/admin/users/${S1id}`, A, { role: 'agent' });
  const demoteSA = await call('PATCH', `/admin/users/${S1id}`, SA, { role: 'agent' });
  const afterDemote = (await call('GET', '/admin/users', SA)).data.data.find((u) => u.id === S1id);
  rec('SEC-14b', 'Break system', 'Owner/Super Admin', 'Undo the promotion: demote staff back to agent', 'role = agent', `owner=${demoteO.status}, superadmin=${demoteSA.status}, role now=${afterDemote?.role}`, afterDemote?.role === 'agent', 'Once promoted, staff cannot be demoted and drops out of the owner\'s team');
  // replace the broken staff with a fresh one for the rest of the run
  await call('DELETE', `/admin/users/${S1id}`, SA);
  const s1n = await call('POST', '/admin/users', A, { name: 'Staff One', email: `s1b${uniq}@t.com`, password: 'Staff123', data_scope: 'own_only' });
  S1id = s1n.data.data.id;
  S1 = (await call('POST', '/auth/login', null, { email: `s1b${uniq}@t.com`, password: 'Staff123' })).data.data.token;

  const emailSteal = await call('PATCH', `/admin/users/${S2id}`, A, { email: `ownerb${uniq}@t.com` });
  rec('SEC-15', 'Break system', 'Owner', 'Owner changes staff email to an email that already belongs to Owner B', '409', emailSteal.status, emailSteal.status === 409);
  if (emailSteal.status === 200) await call('PATCH', `/admin/users/${S2id}`, A, { email: `s2${uniq}@t.com` });

  const orphan = await call('POST', '/auth/register', null, { name: 'Self Staff', email: `orphan${uniq}@t.com`, password: 'x12345', persona: 'staff' });
  rec('SEC-16', 'Break system', 'Public', 'Anyone registers directly as "staff" from public signup (no owner, no seat check)', '400/403', orphan.status, orphan.status >= 400);
  const nopass = await call('POST', '/auth/register', null, { name: 'No Pass', email: `nopass${uniq}@t.com` });
  const nopassLogin = await call('POST', '/auth/login', null, { email: `nopass${uniq}@t.com`, password: 'admin123' });
  rec('SEC-17', 'Break system', 'Public', 'Register without password → account gets default password admin123', 'register rejected', `register=${nopass.status}, login with admin123=${nopassLogin.status}`, nopass.status >= 400);
  const pwChange = await call('PATCH', '/auth/profile', S2, { new_password: 'a' });
  rec('SEC-18', 'Break system', 'Staff', 'Change password with no current password and 1-char new password', '400', pwChange.status, pwChange.status === 400);
  const enumRes = await call('POST', '/auth/login', null, { email: `nobody${uniq}@t.com`, password: 'x' });
  rec('SEC-19', 'Break system', 'Public', 'Login error reveals whether an email is registered', 'generic message', enumRes.data?.message, !/no account/i.test(enumRes.data?.message || ''));

  // ---------- LEADS ----------
  const lA = await call('POST', '/leads', A, { company_name: 'Gulf Foods', follow_up_date: today, products: ['Rice'], quantity: 20, price: 900, credit_rating: 'AA', assigned_to: S1id, today_remarks: 'Intro call', next_follow_up_action: 'Send quote' });
  rec('LD-01', 'Leads', 'Owner', 'Owner creates lead with commercial (owner-only) fields and assigns to staff', '201', lA.status, lA.status === 201);
  const LA = lA.data.data.id;
  const lS1 = await call('POST', '/leads', S1, { company_name: 'Lanka Spice', follow_up_date: today, today_remarks: 'Cold call, interested', next_follow_up_action: 'Call back' });
  rec('LD-02', 'Leads', 'Staff', 'Staff creates lead with basic fields', '201', lS1.status, lS1.status === 201);
  const LS1 = lS1.data.data.id;
  rec('LD-03', 'Demo data', 'Staff', 'Staff lead without product gets fake default product', 'products = []', JSON.stringify(lS1.data.data.products), (lS1.data.data.products || []).length === 0, 'Backend inserts "Turmeric" when no product is given');
  const lS1price = await call('POST', '/leads', S1, { today_remarks: 'Discussed requirement', next_follow_up_action: 'Send quote', company_name: 'X', follow_up_date: today, price: 5000 });
  rec('LD-04', 'Permissions', 'Staff', 'Staff tries to set price (owner-only field) on create', '403', lS1price.status, lS1price.status === 403);
  const lNoRemark = await call('POST', '/leads', S1, { company_name: 'No Remark Co', follow_up_date: today });
  rec('LD-28', 'Validation', 'Staff', 'Create lead without today\'s discussion remark / next action', '400', lNoRemark.status, lNoRemark.status === 400);
  const lNoFU = await call('POST', '/leads', S1, { today_remarks: 'Discussed requirement', next_follow_up_action: 'Send quote', company_name: 'No Date Co' });
  rec('LD-05', 'Validation', 'Staff', 'Create lead without follow-up date', '400', lNoFU.status, lNoFU.status === 400);
  const lS2 = await call('POST', '/leads', S2, { today_remarks: 'Discussed requirement', next_follow_up_action: 'Send quote', company_name: 'Viet Agro', follow_up_date: today });
  const LS2 = lS2.data.data.id;
  const lB = await call('POST', '/leads', B, { today_remarks: 'Discussed requirement', next_follow_up_action: 'Send quote', company_name: 'Beta Secret Buyer', follow_up_date: today, price: 99999, email: 'secret@beta-buyer.com' });
  const LB = lB.data.data.id;

  const s1Edit = await call('PATCH', `/leads/${LS1}`, S1, { company_name: 'Lanka Spice (renamed by staff)' });
  rec('LD-06', 'Your rule', 'Staff', 'Staff EDITS a lead he created (rule: only owner may correct)', '403', s1Edit.status, s1Edit.status === 403);
  const s1Stage = await call('PATCH', `/leads/${LS1}`, S1, { stage: 'Closed Won' });
  rec('LD-07', 'Your rule', 'Staff', 'Staff marks his own lead "Closed Won" (inflates performance)', 'owner approval / 403', s1Stage.status, s1Stage.status === 403);
  const s1Remark = await call('PATCH', `/leads/${LS1}`, S1, { today_remarks: 'Discussed price', next_follow_up_action: 'Send sample', follow_up_date: today });
  rec('LD-08', 'Remarks', 'Staff', 'Staff adds a new remark / next action on his lead (should be allowed, append-only)', '200', s1Remark.status, s1Remark.status === 200);
  const s1History = await call('PATCH', `/leads/${LS1}`, S1, { previous_remarks: [] });
  const afterHist = (await call('GET', `/leads/${LS1}`, A)).data?.data?.previous_remarks || [];
  rec('LD-09', 'Remarks', 'Staff', 'Staff tries to wipe remark history', 'history kept', `status=${s1History.status}, history entries=${afterHist.length}`, afterHist.length > 0);
  const ownerWipe = await call('PATCH', `/leads/${LS1}`, A, { previous_remarks: [] });
  const afterOwnerWipe = (await call('GET', `/leads/${LS1}`, A)).data?.data?.previous_remarks || [];
  rec('LD-10', 'Remarks', 'Owner', 'Owner can silently erase the full remark history (no audit)', 'history immutable or audited', `status=${ownerWipe.status}, entries now=${afterOwnerWipe.length}`, afterOwnerWipe.length > 0);
  const s1Del = await call('DELETE', `/leads/${LS1}`, S1);
  rec('LD-11', 'Permissions', 'Staff', 'Staff deletes own lead', '403', s1Del.status, s1Del.status === 403);
  const s1EditA = await call('PATCH', `/leads/${LS2}`, S1, { today_remarks: 'x' });
  rec('LD-12', 'Permissions', 'Staff', 'Staff (own_only) edits a colleague\'s lead', '403/404', s1EditA.status, s1EditA.status === 403 || s1EditA.status === 404);
  const s1List = (await call('GET', '/leads', S1)).data.data.map((l) => l.id);
  rec('LD-13', 'Isolation', 'Staff', 'Staff (own_only) lead list', 'only his leads', s1List.join(','), !s1List.includes(LS2) && !s1List.includes(LB));
  const s2List = (await call('GET', '/leads', S2)).data.data.map((l) => l.id);
  rec('LD-14', 'Isolation', 'Staff (all)', 'Staff with data scope "all" sees company leads', 'A leads, not B', s2List.length, s2List.includes(LS1) && !s2List.includes(LB));
  const s2Open = await call('GET', `/leads/${LS1}`, S2);
  rec('LD-15', 'UX', 'Staff (all)', 'Staff with scope "all" opens a colleague lead he can see in the list', '200', s2Open.status, s2Open.status === 200, 'List shows it, detail returns 403');
  const aList = (await call('GET', '/leads', A)).data.data;
  const demo = aList.filter((l) => /^lead_\d+$/.test(l.id));
  rec('LD-16', 'Demo data', 'Owner', 'Brand-new owner sees no demo/dummy leads', '0 demo leads', `${demo.length} demo`, demo.length === 0);
  const bGetA = await call('GET', `/leads/${LA}`, B);
  const bPatchA = await call('PATCH', `/leads/${LA}`, B, { stage: 'Closed Lost' });
  const bDelA2 = await call('DELETE', `/leads/${LA}`, B);
  rec('LD-17', 'Isolation', 'Owner B', 'Owner B reads/edits/deletes Owner A lead by ID', '404 x3', `${bGetA.status},${bPatchA.status},${bDelA2.status}`, [bGetA.status, bPatchA.status, bDelA2.status].every((s) => s === 404));
  const bList = (await call('GET', '/leads', B)).data.data.map((l) => l.id);
  rec('LD-18', 'Isolation', 'Owner B', 'Owner B lead list does not contain A leads', 'no A leads', bList.length, !bList.includes(LA) && !bList.includes(LS1));
  const cross = await call('POST', '/leads', A, { today_remarks: 'Discussed requirement', next_follow_up_action: 'Send quote', company_name: 'Cross', follow_up_date: today, assigned_to: BS1id });
  rec('LD-19', 'Isolation', 'Owner', 'Owner A assigns a lead to Owner B staff', '400', cross.status, cross.status === 400);
  const fullObj = (await call('GET', `/leads/${LA}`, A)).data.data;
  const fullSave = await call('PATCH', `/leads/${LA}`, A, { ...fullObj, notes: 'edited in Follow-up page' });
  rec('LD-20', 'UX bug', 'Owner', 'Follow-up page "Save customer" sends the whole lead object', '200', fullSave.status, fullSave.status === 200, 'Backend rejects (id/created_at/owner fields); UI swallows the error and shows saved');
  const reassign = await call('PATCH', `/leads/${LA}`, A, { assigned_to: S2id });
  const afterReassign = (await call('GET', `/leads/${LA}`, A)).data.data;
  rec('LD-21', 'Leads', 'Owner', 'Owner reassigns lead; original creator stays', 'creator unchanged', afterReassign.created_by_id, reassign.status === 200 && afterReassign.created_by_id === Aid);
  await new Promise((r) => setTimeout(r, 5500));
  const dupl = await call('POST', '/leads', S1, { today_remarks: 'Discussed requirement', next_follow_up_action: 'Send quote', company_name: 'Lanka Spice', follow_up_date: today });
  rec('LD-22', 'Data quality', 'Staff', 'Same company created twice (after 5 sec)', 'duplicate warning', dupl.status, dupl.status !== 201, 'Only a 5-second double-click guard exists');

  const ownerFix = await call('PATCH', `/leads/${LS1}`, A, { company_name: 'Lanka Spice Pvt Ltd', products: ['Cinnamon'], price: 1200 });
  rec('LD-23', 'Leads', 'Owner', 'Owner corrects a staff-created lead incl. commercial fields', '200', ownerFix.status, ownerFix.status === 200);
  const ownerDel = await call('POST', '/leads', A, { today_remarks: 'Discussed requirement', next_follow_up_action: 'Send quote', company_name: 'Temp Co', follow_up_date: today });
  const ownerDelR = await call('DELETE', `/leads/${ownerDel.data.data.id}`, A);
  rec('LD-24', 'Leads', 'Owner', 'Owner deletes a lead', '200', ownerDelR.status, ownerDelR.status === 200);

  // ---------- TASKS ----------
  const tA = await call('POST', '/tasks', A, { title: 'Send quote to Gulf Foods', assigned_to: S1id, due_date: yesterday, lead_id: LA });
  rec('TK-01', 'Tasks', 'Owner', 'Owner creates task for staff (overdue)', '201', tA.status, tA.status === 201);
  const TA = tA.data.data.id;
  const tA2 = await call('POST', '/tasks', A, { title: 'Book container', assigned_to: S1id, due_date: today });
  const TA2 = tA2.data.data.id;
  const tCross = await call('POST', '/tasks', A, { title: 'x', assigned_to: BS1id });
  rec('TK-02', 'Isolation', 'Owner', 'Owner assigns task to another company staff', '400', tCross.status, tCross.status === 400);
  const tS1 = await call('POST', '/tasks', S1, { title: 'My own reminder' });
  rec('TK-03', 'Tasks', 'Staff', 'Staff creates a personal to-do for himself', '201', tS1.status, tS1.status === 201);
  const tS1other = await call('POST', '/tasks', S1, { title: 'Do this', assigned_to: S2id });
  rec('TK-03b', 'Permissions', 'Staff', 'Staff assigns a task to a colleague', '403', tS1other.status, tS1other.status === 403);
  const tTitle = await call('PATCH', `/tasks/${TA}`, S1, { title: 'changed' });
  rec('TK-04', 'Permissions', 'Staff', 'Staff renames owner task', '403', tTitle.status, tTitle.status === 403);
  const tDone = await call('PATCH', `/tasks/${TA}`, S1, { status: 'Completed', completion_notes: 'Quote sent' });
  rec('TK-05', 'Tasks', 'Staff', 'Staff completes his task with notes', '200', tDone.status, tDone.status === 200);
  const doneTask = (await call('GET', '/tasks', A)).data.data.find((t) => t.id === TA);
  rec('TK-06', 'Performance', 'Owner', 'Completion time recorded (needed for on-time vs late review)', 'completed_at set', doneTask?.completed_at || 'missing', Boolean(doneTask?.completed_at));
  const tCancel = await call('PATCH', `/tasks/${TA2}`, S1, { status: 'Cancelled' });
  rec('TK-07', 'Your rule', 'Staff', 'Staff cancels a task the owner gave him', '403', tCancel.status, tCancel.status === 403);
  const tReopen = await call('PATCH', `/tasks/${TA}`, S1, { status: 'Pending' });
  rec('TK-08', 'Your rule', 'Staff', 'Staff re-opens / un-completes a task (hides history)', '403 or logged', tReopen.status, tReopen.status === 403);
  const tDel = await call('DELETE', `/tasks/${TA}`, S1);
  rec('TK-09', 'Permissions', 'Staff', 'Staff deletes task', '403', tDel.status, tDel.status === 403);
  const tUi = await call('PATCH', `/tasks/${TA2}`, A, { title: 'Book 2 containers', description: '', priority: 'High', due_date: today, deadline_time: '18:00', assigned_to: S1id, assigned_name: 'Staff One', status: 'Pending' });
  rec('TK-10', 'UX bug', 'Owner', 'Owner edits task from the Tasks page (UI sends assigned_name)', '200', tUi.status, tUi.status === 200, 'Server rejects; UI shows "updated successfully" anyway');
  const bTasks = (await call('GET', '/tasks', B)).data.data.map((t) => t.id);
  rec('TK-11', 'Isolation', 'Owner B', 'Owner B task list has no A tasks', 'none', bTasks.length, !bTasks.includes(TA));
  const s2Tasks = (await call('GET', '/tasks', S2)).data.data.map((t) => t.id);
  rec('TK-12', 'Isolation', 'Staff', 'Staff sees only his own tasks', 'no S1 tasks', s2Tasks.length, !s2Tasks.includes(TA2));

  // ---------- FOLLOW-UPS ----------
  const fS1 = await call('POST', '/followup', S1, { lead_id: LS1, client_name: 'Lanka Spice', scheduled_date: yesterday, today_remarks: 'Asked for price', next_follow_up_action: 'Share CIF price' });
  rec('FU-01', 'Follow-up', 'Staff', 'Staff schedules follow-up on own lead', '201', fS1.status, fS1.status === 201);
  const FS1 = fS1.data.data.id;
  const fOther = await call('POST', '/followup', S1, { lead_id: LS2, client_name: 'Viet', scheduled_date: today });
  rec('FU-02', 'Permissions', 'Staff', 'Staff (own_only) schedules follow-up on colleague lead', '403/404', fOther.status, fOther.status >= 400);
  const fNoReason = await call('PATCH', `/followup/${FS1}`, S1, { scheduled_date: '2030-01-01' });
  rec('FU-03', 'Follow-up', 'Staff', 'Staff pushes a follow-up date without giving a reason', '400', fNoReason.status, fNoReason.status === 400);
  const fAgenda = await call('PATCH', `/followup/${FS1}`, S1, { agenda: 'changed agenda', client_name: 'Other' });
  rec('FU-03b', 'Your rule', 'Staff', 'Staff rewrites the client name / agenda of a follow-up', '403', fAgenda.status, fAgenda.status === 403);
  const fResched = await call('PATCH', `/followup/${FS1}`, S1, { scheduled_date: today, today_remarks: 'Client busy, asked to call today' });
  const fAfter = (await call('GET', '/followup', A)).data.data.find((f) => f.id === FS1);
  const logged = (fAfter?.history || []).some((h) => h.action === 'rescheduled' && h.remark);
  rec('FU-03c', 'Follow-up', 'Staff', 'Staff reschedules with a reason: allowed and logged in history', '200 + logged', `${fResched.status}, logged=${logged}, count=${fAfter?.reschedule_count}`, fResched.status === 200 && logged);
  const fDoneNoRemark = await call('PATCH', `/followup/${FS1}`, S1, { status: 'Completed' });
  rec('FU-04', 'Follow-up', 'Staff', 'Staff marks follow-up Completed without writing what was discussed', '400 remarks required', fDoneNoRemark.status, fDoneNoRemark.status === 400);
  const fDone = await call('PATCH', `/followup/${FS1}`, S1, { status: 'Completed', today_remarks: 'Shared CIF price, client will confirm Monday', next_follow_up_action: 'Confirm order' });
  rec('FU-04b', 'Follow-up', 'Staff', 'Staff completes follow-up with what was discussed', '200', fDone.status, fDone.status === 200);
  const fReopen = await call('PATCH', `/followup/${FS1}`, S1, { status: 'Scheduled', scheduled_date: '2031-01-01', today_remarks: 'x' });
  rec('FU-04c', 'Your rule', 'Staff', 'Staff edits a follow-up that is already completed', '403', fReopen.status, fReopen.status === 403);
  const fu = (await call('GET', '/followup', A)).data.data.find((f) => f.id === FS1);
  rec('FU-05', 'Performance', 'Owner', 'Follow-up keeps history of reschedules & completion time', 'history + completed_at', JSON.stringify({ completed_at: fu?.completed_at || null, history: fu?.history || null }), Boolean(fu?.completed_at && fu?.history));
  const fMiss = await call('POST', '/followup', S1, { lead_id: LS1, client_name: 'Lanka Spice', scheduled_date: '2020-01-01' });
  const missed = (await call('GET', '/followup', A)).data.data.find((f) => f.id === fMiss.data?.data?.id);
  rec('FU-06', 'Reminders', 'Owner', 'Past-date follow-up automatically shows as Missed/Overdue', 'Missed', missed?.status, missed?.status === 'Missed' || missed?.status === 'Overdue');
  const bF = (await call('GET', '/followup', B)).data.data.map((f) => f.id);
  rec('FU-07', 'Isolation', 'Owner B', 'Owner B cannot see A follow-ups', 'none', bF.length, !bF.includes(FS1));
  const fDel = await call('DELETE', `/followup/${FS1}`, S1);
  rec('FU-08', 'Permissions', 'Staff', 'Staff deletes follow-up', '403', fDel.status, fDel.status === 403);
  const leadHist = (await call('GET', `/leads/${LS1}`, A)).data.data.previous_remarks || [];
  rec('FU-09', 'Remarks', 'Owner', 'Lead remark history shows staff follow-up entries with author', 'entries with author', leadHist.length, leadHist.length > 0 && leadHist.every((h) => h.author));
  const remindersRoute = await call('GET', '/reminders', A);
  rec('FU-10', 'Reminders', 'Owner', 'Reminder service exists (due today / overdue alerts)', 'endpoint/notifications', remindersRoute.status, remindersRoute.status === 200, 'No reminder engine, no scheduled job, no push/email');

  // ---------- PERFORMANCE REVIEW ----------
  const perf = await call('GET', `/analytics/staff/${S1id}`, A);
  rec('PR-01', 'Performance', 'Owner', 'Per-staff performance report (tasks done/missed, follow-ups done/missed, remarks)', 'report', perf.status, perf.status === 200, 'No endpoint; owner must piece it together manually');
  const an = await call('GET', '/analytics', A);
  rec('PR-02', 'Performance', 'Owner', 'Analytics "active team members" counts only my company', '3 (owner+2)', an.data?.data?.kpis?.activeTeamMembers, an.data?.data?.kpis?.activeTeamMembers <= 3, 'Counts every user on the platform');
  const s1An = await call('GET', '/analytics', S1);
  rec('PR-03', 'Permissions', 'Staff', 'Staff opens analytics without permission', '403', s1An.status, s1An.status === 403);
  const myDay = await call('POST', '/mydays', S1, { kind: 'report', date_iso: today, leads: 3, remarks: 5, summary: 'Called 10 buyers' });
  const ownerSeesMyDay = (await call('GET', '/mydays?scope=team', A)).data.data.some((d) => d.id === myDay.data?.data?.id);
  rec('PR-04', 'Performance', 'Owner', 'Staff daily report (My Day) is saved on the server and visible to the owner', 'visible', ownerSeesMyDay, ownerSeesMyDay);
  const bSeesMyDay = (await call('GET', '/mydays?scope=team', B)).data.data.some((d) => d.id === myDay.data?.data?.id);
  rec('PR-04b', 'Isolation', 'Owner B', 'Other company cannot see that daily report', 'not visible', bSeesMyDay, !bSeesMyDay);
  const fakeReport = await call('POST', '/mydays', S1, { kind: 'report', user_id: S2id, summary: 'fake' });
  rec('PR-04c', 'Break system', 'Staff', 'Staff logs a daily report in a colleague\'s name', '403', fakeReport.status, fakeReport.status === 403);
  const delReport = await call('DELETE', `/mydays/${myDay.data?.data?.id}`, S1);
  rec('PR-04d', 'Your rule', 'Staff', 'Staff deletes his submitted daily report', '403', delReport.status, delReport.status === 403);

  // ---------- OUTREACH & ACTIVITY ----------
  await call('POST', '/outreach/record', BS1, { calls_made: 7 });
  const aOut = (await call('GET', '/outreach', A)).data.data;
  const outLeak = aOut.some((o) => o.employee_id === BS1id);
  rec('OR-01', 'Isolation', 'Owner', 'Owner A outreach matrix contains Owner B staff numbers', 'no B data', `leak=${outLeak}, rows=${aOut.length}`, !outLeak);
  const forge = await call('POST', '/outreach/record', S1, { employee_id: S2id, calls_made: 0, emails_sent: 0 });
  rec('OR-02', 'Break system', 'Staff', 'Staff overwrites a colleague\'s outreach numbers', '403', forge.status, forge.status === 403);
  const forgeB = await call('POST', '/outreach/record', S1, { employee_id: BS1id, calls_made: 999 });
  rec('OR-03', 'Break system', 'Staff', 'Staff of A overwrites outreach of B\'s staff', '403', forgeB.status, forgeB.status === 403);
  const actOther = await call('POST', '/activity', S1, { title: 'x', lead_id: LS2 });
  rec('AC-01', 'Permissions', 'Staff', 'Staff logs activity on colleague lead', '403', actOther.status, actOther.status === 403 || actOther.status === 404);
  const bAct = (await call('GET', '/activity', B)).data.data;
  const actLeak = bAct.some((a) => a.lead_id === LA || a.lead_id === LS1);
  rec('AC-02', 'Isolation', 'Owner B', 'Owner B activity feed has no A activity', 'none', actLeak, !actLeak);

  // ---------- EMAIL MARKETING ----------
  const eS1 = await call('GET', '/email/settings', S1);
  rec('EM-01', 'Email', 'Staff', 'Staff opens Email Marketing', '403', eS1.status, eS1.status === 403);
  const eB = await call('GET', '/email/settings', B);
  rec('EM-02', 'Email', 'Owner B', 'Owner without premium flag opens Email Marketing', '403', eB.status, eB.status === 403);
  await call('PATCH', `/admin/users/${Aid}/features`, SA, { email_marketing: true });
  await call('PATCH', `/leads/${LA}`, A, { email: 'buyer@gulf.com' });
  const prev = await call('GET', '/email/audience/preview?mode=all', A);
  const sample = (prev.data?.data?.sample || []).map((s) => s.company).join(' | ');
  const foreign = (prev.data?.data?.sample || []).some((s) => /Beta Secret|Al-Barakah|VietSpices/i.test(s.company));
  rec('EM-03', 'Isolation', 'Owner', 'Email audience "all leads" contains only my company leads', 'only A leads', `${prev.status}: ${sample}`, prev.status === 200 && !foreign, 'Leads without company_id (demo/legacy) of other tenants are included');


  // ---------- EXTRA CHECKS FOR THE FIXES ----------
  const saLimit = await call('PATCH', `/admin/users/${Bid}/staff-limit`, SA, { staff_limit: 3 });
  rec('SA-01', 'Super Admin', 'Super Admin', 'Super Admin can still change an owner\'s staff limit', '200', saLimit.status, saLimit.status === 200);
  const saAudit = await call('GET', '/admin/audit-logs', SA);
  rec('SA-02', 'Super Admin', 'Super Admin', 'Super Admin can still read the audit log', '200', saAudit.status, saAudit.status === 200);
  const saOverview = await call('GET', '/admin/overview-summary', SA);
  const saHash = JSON.stringify(saOverview.data || {}).includes('$2a$') || JSON.stringify(saOverview.data || {}).includes('$2b$');
  rec('SA-03', 'Super Admin', 'Super Admin', 'Overview no longer contains password hashes', 'no hashes', `${saOverview.status}, hashes=${saHash}`, saOverview.status === 200 && !saHash);

  const weak = await call('POST', '/auth/register', null, { name: 'Weak', email: `weak${uniq}@t.com`, password: '123' });
  rec('SEC-20', 'Break system', 'Public', 'Register with a 3-character password', '400', weak.status, weak.status === 400);
  const oldTok = BS1;
  const pw = await call('PATCH', '/auth/profile', BS1, { current_password: 'Staff123', new_password: 'NewStaff456' });
  const oldUse = await call('GET', '/leads', oldTok);
  const newUse = await call('GET', '/leads', pw.data?.data?.token);
  rec('SEC-21', 'Break system', 'Staff', 'After a password change, the old session token stops working', 'old 401, new 200', `change=${pw.status}, old=${oldUse.status}, new=${newUse.status}`, pw.status === 200 && oldUse.status === 401 && newUse.status === 200);
  let lastStatus = 0;
  for (let i = 0; i < 11; i++) lastStatus = (await call('POST', '/auth/login', null, { email: `ownerb${uniq}@t.com`, password: 'wrong' })).status;
  const otherLogin = await call('POST', '/auth/login', null, { email: `ownera${uniq}@t.com`, password: 'PassA123' });
  rec('SEC-22', 'Break system', 'Public', 'Brute-force on one account is blocked, but colleagues on the same network can still log in', '429 for attacker, 200 for others', `attacked=${lastStatus}, colleague=${otherLogin.status}`, lastStatus === 429 && otherLogin.status === 200);
  await call('PATCH', `/admin/users/${Bid}/status`, SA);
  const suspendedStaff = await call('POST', '/auth/login', null, { email: `bs1${uniq}@t.com`, password: 'NewStaff456' });
  rec('SEC-23', 'Staff', 'Super Admin', 'Staff of a suspended company cannot log in', '403', suspendedStaff.status, suspendedStaff.status === 403);
  await call('PATCH', `/admin/users/${Bid}/status`, SA);
  const evil = await fetch(BASE + '/leads', { headers: { Origin: 'https://evil.example.com', Authorization: `Bearer ${A}` } });
  const acao = evil.headers.get('access-control-allow-origin');
  const good = await fetch(BASE + '/leads', { headers: { Origin: 'https://crm-amber-nine.vercel.app', Authorization: `Bearer ${A}` } });
  rec('SEC-24', 'Break system', 'Other website', 'A random website cannot read the API from a logged-in browser (CORS)', 'evil blocked, app allowed', `evil=${acao || 'none'}, app=${good.headers.get('access-control-allow-origin')}`, !acao && good.headers.get('access-control-allow-origin') === 'https://crm-amber-nine.vercel.app');

  const fwd = await call('PATCH', `/leads/${LS1}`, S1, { stage: 'Sample Sent' });
  rec('LD-25', 'Leads', 'Staff', 'Staff moves his lead forward (Sample Sent)', '200', fwd.status, fwd.status === 200);
  const reas = await call('PATCH', `/leads/${LS1}`, S1, { assigned_to: S2id });
  rec('LD-26', 'Your rule', 'Staff', 'Staff reassigns his lead to someone else', '403', reas.status, reas.status === 403);
  const leadNow = (await call('GET', `/leads/${LS1}`, A)).data.data;
  rec('LD-27', 'Remarks', 'Owner', 'Owner sees who corrected what on a lead (edit history)', 'edit history present', (leadNow.edit_history || []).length, (leadNow.edit_history || []).length > 0);

  const corr = await call('POST', '/tasks', S1, { title: '[Correction] wrong phone on Lanka Spice', is_correction: true, original_task_id: TA });
  const aNotifs = (await call('GET', '/notifications', A)).data.data;
  const gotCorr = aNotifs.some((n) => n.title === 'Correction request from staff');
  rec('TK-13', 'Your rule', 'Staff→Owner', 'Staff correction request reaches the owner as a notification', '201 + owner notified', `${corr.status}, notified=${gotCorr}`, corr.status === 201 && gotCorr);
  const s1Done = await call('PATCH', `/tasks/${TA2}`, S1, { status: 'Completed' });
  rec('TK-14', 'Tasks', 'Staff', 'Staff completes the second task', '200', s1Done.status, s1Done.status === 200);

  const team = await call('GET', '/analytics/team', A);
  rec('PR-05', 'Performance', 'Owner', 'Owner team performance summary', '200, my staff only', `${team.status}, members=${team.data?.data?.members?.length}`, team.status === 200 && team.data.data.members.every((m) => [Aid, S1id, S2id].includes(m.user.id)));
  const staffTeam = await call('GET', '/analytics/team', S1);
  rec('PR-06', 'Permissions', 'Staff', 'Staff opens team performance', '403', staffTeam.status, staffTeam.status === 403);
  const peek = await call('GET', `/analytics/staff/${S2id}`, S1);
  rec('PR-07', 'Permissions', 'Staff', 'Staff opens a colleague\'s performance report', '404', peek.status, peek.status === 404);
  const bPeek = await call('GET', `/analytics/staff/${S1id}`, B);
  rec('PR-08', 'Isolation', 'Owner B', 'Owner B opens Owner A staff performance', '404', bPeek.status, bPeek.status === 404);
  const rep = (await call('GET', `/analytics/staff/${S1id}?from=2020-01-01`, A)).data?.data?.summary || {};
  rec('PR-09', 'Performance', 'Owner', 'Report shows tasks done on time/late, missed follow-ups, remarks written', 'numbers filled', JSON.stringify({ late: rep.tasks_completed_late, onTime: rep.tasks_completed_on_time, fuDone: rep.followups_completed, fuMissed: rep.followups_missed, remarks: rep.remarks_written }), rep.tasks_completed_late >= 1 && rep.followups_completed >= 1 && rep.followups_missed >= 1 && rep.remarks_written >= 1);

  const ownOut = await call('POST', '/outreach/record', S1, { calls_made: 12 });
  rec('OR-04', 'Outreach', 'Staff', 'Staff records his own outreach', '200', ownOut.status, ownOut.status === 200);
  const ownerOut = await call('POST', '/outreach/record', A, { employee_id: S1id, calls_made: 14 });
  rec('OR-05', 'Outreach', 'Owner', 'Owner corrects outreach of his own staff', '200', ownerOut.status, ownerOut.status === 200);
  const ownerOutB = await call('POST', '/outreach/record', A, { employee_id: BS1id, calls_made: 1 });
  rec('OR-06', 'Isolation', 'Owner', 'Owner A records outreach for Owner B staff', '403', ownerOutB.status, ownerOutB.status === 403);

  const remS = await call('GET', '/reminders', S1);
  const remA = await call('GET', '/reminders', A);
  rec('RM-01', 'Reminders', 'Staff', 'Staff reminders list overdue & today items', '200 with counts', `${remS.status} ${JSON.stringify(remS.data?.data?.counts || {})}`, remS.status === 200 && remS.data.data.counts && typeof remS.data.data.total === 'number');
  rec('RM-02', 'Reminders', 'Owner', 'Owner reminders include a per-staff overdue summary', 'team rows', `${remA.status}, team=${(remA.data?.data?.team || []).length}`, remA.status === 200 && Array.isArray(remA.data.data.team) && remA.data.data.team.length >= 1);

  await call('PATCH', `/admin/users/${S1id}`, A, { permissions: { view_leads: false } });
  const blockedLeads = await call('GET', '/leads', S1);
  await call('PATCH', `/admin/users/${S1id}`, A, { permissions: { view_leads: true } });
  const unblocked = await call('GET', '/leads', S1);
  rec('PERM-01', 'Permissions', 'Owner→Staff', 'Owner switches off "view leads" for a staff member, then back on', '403 then 200', `${blockedLeads.status} then ${unblocked.status}`, blockedLeads.status === 403 && unblocked.status === 200);

  const me = await call('GET', '/auth/me', S1);
  const meTokenWorks = me.data?.data?.token ? (await call('GET', '/leads', me.data.data.token)).status : 0;
  rec('AUTH-01', 'Session', 'Staff', 'Opening the app hands back a fresh session token (no surprise logouts)', 'token works', `${me.status}, fresh token → ${meTokenWorks}`, me.status === 200 && meTokenWorks === 200);
  const junk = await call('GET', '/leads', 'undefined');
  rec('AUTH-02', 'Session', 'Anyone', 'A broken/old token gets a clear "log in again" answer', '401', junk.status, junk.status === 401);

  // ---------- ACCOUNT LIFECYCLE ----------
  await call('PATCH', `/admin/users/${S2id}/status`, A);
  const deact = await call('GET', '/leads', S2);
  rec('AL-01', 'Staff', 'Owner', 'Deactivated staff is blocked immediately', '403', deact.status, deact.status === 403);
  await call('DELETE', `/admin/users/${S2id}`, A);
  const s2LeadAfter = (await call('GET', '/leads', A)).data.data.find((l) => l.id === LS2);
  rec('AL-02', 'Staff', 'Owner', 'After deleting a staff, his leads stay with the owner', 'lead visible', Boolean(s2LeadAfter), Boolean(s2LeadAfter));
  const s4 = await call('POST', '/admin/users', A, { name: 'Staff Four', email: `s4${uniq}@t.com`, password: 'Staff123' });
  rec('AL-03', 'Staff', 'Owner', 'Seat freed after deleting staff, owner can add another', '201', s4.status, s4.status === 201);

  server.close();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(results, null, 1));
  } else {
    for (const r of results) {
      console.log(`${r.result === 'PASS' ? '✅' : '❌'} ${r.id.padEnd(8)} [${r.who}] ${r.scenario}${r.result === 'PASS' ? '' : `  → expected ${r.expected}, got ${r.actual}`}`);
    }
  }
  const failed = results.filter((r) => r.result !== 'PASS').length;
  console.log(`\nROLE SCENARIOS: ${results.length - failed} PASSED | ${failed} FAILED | TOTAL: ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('HARNESS ERROR', e);
  process.exit(1);
});
