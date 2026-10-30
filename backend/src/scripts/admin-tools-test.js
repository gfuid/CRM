/**
 * Tests: "email already exists" for staff, re-using emails of deleted accounts, Super Admin tools
 * (move a company under another owner, change email, delete staff, storage/staff limits), keep-alive ping.
 *   node src/scripts/admin-tools-test.js
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdm1n!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'admin_tools_test_secret';

const http = require('http');
const app = require('../app');
const { dataStore } = require('../repositories/dataStore');

let BASE = '';
const results = [];
const call = async (method, path, token, body) => {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
};
const rec = (id, who, scenario, expected, actual, pass) => results.push({ id, who, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const u = Date.now();
const today = new Date().toISOString().split('T')[0];
const login = async (email, password) => (await call('POST', '/auth/login', null, { email, password }));

(async () => {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  BASE = `http://127.0.0.1:${server.address().port}/api/v1`;
  const SA = (await call('POST', '/auth/admin-login', null, { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD })).data.data.token;

  // Old account (like export@ambavi.in) and the new account the customer uses now
  const oldEmail = `export${u}@ambavi.in`;
  const oldReg = await call('POST', '/auth/register', null, { name: 'Sunil Chaithanya', email: oldEmail, password: 'OldPass123', company_name: 'Ambavi International' });
  const OLD = oldReg.data.data.token, OLDid = oldReg.data.data.user.id;
  const newReg = await call('POST', '/auth/register', null, { name: 'Sunil C', email: `sunil${u}@gmail.com`, password: 'NewPass123', company_name: 'AMBAVI' });
  const NEW = newReg.data.data.token, NEWid = newReg.data.data.user.id;
  const other = await call('POST', '/auth/register', null, { name: 'Other', email: `other${u}@t.com`, password: 'Other123', company_name: 'Other Co' });
  const OTH = other.data.data.token;
  const oldLead = (await call('POST', '/leads', OLD, { company_name: 'Fortune Agro Industries', follow_up_date: today, today_remarks: 'Old real buyer', next_follow_up_action: 'Call' })).data.data;
  const oldStaffId = (await call('POST', '/admin/users', OLD, { name: 'Old Staff', email: `oldstaff${u}@ambavi.in`, password: 'Staff123' })).data.data.id;
  await call('POST', '/support/tickets', OLD, { subject: 'Old account ticket', description: 'Old ticket description' });
  const otherLead = (await call('POST', '/leads', OTH, { company_name: 'Other buyer', follow_up_date: today, today_remarks: 'x', next_follow_up_action: 'y' })).data.data;

  // 1. The exact problem from the screenshot
  const dup = await call('POST', '/admin/users', NEW, { name: 'Vinay C', email: oldEmail, password: 'Vinay123' });
  rec('EM-01', 'Owner', 'Create staff with an email that is another owner\'s login', '409 with a clear reason', `${dup.status} ${String(dup.data?.message).slice(0, 60)}`, dup.status === 409 && /owner account/i.test(dup.data.message));

  // 2. Owners cannot use the admin tools
  const ownerMove = await call('POST', `/admin/users/${OLDid}/move-to-owner`, NEW, { target_owner_id: NEWid });
  rec('MV-01', 'Owner', 'Owner tries to move another company into his own', '403', ownerMove.status, ownerMove.status === 403);
  const self = await call('POST', `/admin/users/${OLDid}/move-to-owner`, SA, { target_owner_id: OLDid });
  rec('MV-02', 'Super Admin', 'Move an account under itself', '400', self.status, self.status === 400);
  const toStaff = await call('POST', `/admin/users/${OLDid}/move-to-owner`, SA, { target_owner_id: oldStaffId });
  rec('MV-03', 'Super Admin', 'Move under a staff account (not an owner)', '400', toStaff.status, toStaff.status === 400);

  // 3. Super Admin moves the old account under the new one and releases the email
  const mv = await call('POST', `/admin/users/${OLDid}/move-to-owner`, SA, { target_owner_id: NEWid, free_email: true });
  rec('MV-04', 'Super Admin', 'Move old company under the new owner', '200 + counts', `${mv.status} ${JSON.stringify(mv.data?.data?.moved)}`, mv.status === 200 && mv.data.data.moved.leads === 1 && mv.data.data.moved.staff === 1 && mv.data.data.released_email === oldEmail);
  const newLeads = (await call('GET', '/leads', NEW)).data.data.map((l) => l.id);
  rec('MV-05', 'Owner (new)', 'New owner now sees the old company\'s leads', 'visible', newLeads.includes(oldLead.id), newLeads.includes(oldLead.id));
  const newStaff = (await call('GET', '/admin/users', NEW)).data.data.map((x) => x.id);
  rec('MV-06', 'Owner (new)', 'Old company\'s staff now belong to the new owner', 'listed', newStaff.includes(oldStaffId), newStaff.includes(oldStaffId));
  const oldLogin = await login(oldEmail, 'OldPass123');
  rec('MV-07', 'Old login', 'Old owner login no longer works', '401/403', oldLogin.status, oldLogin.status === 401 || oldLogin.status === 403);
  const oldToken = await call('GET', '/leads', OLD);
  rec('MV-08', 'Old login', 'Old owner\'s open session is ended', '401/403', oldToken.status, oldToken.status === 401 || oldToken.status === 403);
  const tick = (await call('GET', '/support/tickets', NEW)).data.data.map((t) => t.subject);
  rec('MV-09', 'Owner (new)', 'Old account\'s tickets moved too', 'visible', tick.includes('Old account ticket'), tick.includes('Old account ticket'));
  const othLeads = (await call('GET', '/leads', OTH)).data.data.map((l) => l.id);
  rec('MV-10', 'Other company', 'Other company is untouched', 'only own', othLeads.join(','), othLeads.length === 1 && othLeads[0] === otherLead.id);
  const staffLogin = await login(`oldstaff${u}@ambavi.in`, 'Staff123');
  const staffLeads = staffLogin.data?.data?.token ? (await call('GET', '/leads', staffLogin.data.data.token)).status : 0;
  rec('MV-11', 'Moved staff', 'Moved staff can still log in and work', '200', `${staffLogin.status} ${staffLeads}`, staffLogin.status === 200 && staffLeads === 200);

  // 4. Now the email can be used for the new staff member (the customer's request)
  const vinay = await call('POST', '/admin/users', NEW, { name: 'Vinay C', email: oldEmail, password: 'Vinay123' });
  rec('EM-02', 'Owner (new)', 'After release, create staff Vinay with that email', '201 (or 403 seat limit)', `${vinay.status} ${vinay.data?.message || ''}`.slice(0, 80), vinay.status === 201 || (vinay.status === 403 && /limit/i.test(vinay.data.message)));
  if (vinay.status === 403) {
    await call('PATCH', `/admin/users/${NEWid}/staff-limit`, SA, { staff_limit: 3 });
    const again = await call('POST', '/admin/users', NEW, { name: 'Vinay C', email: oldEmail, password: 'Vinay123' });
    rec('EM-03', 'Owner (new)', 'After admin raises the staff limit, Vinay is created', '201', again.status, again.status === 201);
  }
  const vinayLogin = await login(oldEmail, 'Vinay123');
  rec('EM-04', 'Staff', 'Vinay logs in with export@... as STAFF of the new owner', 'staff', `${vinayLogin.status} ${vinayLogin.data?.data?.user?.persona}`, vinayLogin.status === 200 && vinayLogin.data.data.user.persona === 'staff');

  // 5. Deleted staff email can be used again (also after a restart)
  const tmp = (await call('POST', '/admin/users', OTH, { name: 'Temp', email: `temp${u}@t.com`, password: 'Temp1234' })).data.data;
  await call('DELETE', `/admin/users/${tmp.id}`, OTH);
  const reuse = await call('POST', '/admin/users', OTH, { name: 'Temp Again', email: `temp${u}@t.com`, password: 'Temp1234' });
  rec('EM-05', 'Owner', 'Re-create staff with the email of a deleted staff member', '201', reuse.status, reuse.status === 201);
  rec('EM-06', 'Server', 'Re-used email is no longer on the "deleted" list (survives restart)', 'not listed', (dataStore.deletedUserEmails || []).includes(`temp${u}@t.com`), !(dataStore.deletedUserEmails || []).includes(`temp${u}@t.com`));

  // 6. Super Admin tools on any company
  const list = (await call('GET', '/admin/users', SA)).data.data;
  const newRow = list.find((x) => x.id === NEWid);
  rec('AD-01', 'Super Admin', 'Owners list shows storage used / limit', 'storage present', JSON.stringify(newRow?.storage), newRow && newRow.storage && newRow.storage.limit_mb === 50);
  const ownList = (await call('GET', '/admin/users', NEW)).data.data;
  rec('AD-02', 'Owner', 'Owner\'s staff list does not expose other companies\' storage', 'no storage', ownList.some((x) => x.storage), !ownList.some((x) => x.storage));
  const st = await call('PATCH', `/admin/users/${NEWid}/storage-limit`, SA, { storage_limit_mb: 200 });
  const after = (await call('GET', '/admin/my-usage', NEW)).data.data;
  rec('AD-03', 'Super Admin', 'Raise a company\'s storage to 200 MB', 'owner sees 200', `${st.status} ${after.limit_mb}`, st.status === 200 && after.limit_mb === 200);
  const created = await call('POST', '/admin/users', SA, { name: 'Admin Added', email: `adminadd${u}@t.com`, password: 'Staff123', owner_id: (other.data.data.user.id) });
  rec('AD-04', 'Super Admin', 'Create a staff member for any owner', '201 under Other Co', `${created.status} ${created.data?.data?.created_by === other.data.data.user.id}`, created.status === 201 && created.data.data.created_by === other.data.data.user.id);
  const em = await call('PATCH', `/admin/users/${created.data.data.id}`, SA, { email: `renamed${u}@t.com` });
  const emLogin = await login(`renamed${u}@t.com`, 'Staff123');
  rec('AD-05', 'Super Admin', 'Change a staff member\'s login email', 'new email logs in', `${em.status} ${emLogin.status}`, em.status === 200 && emLogin.status === 200);
  const taken = await call('PATCH', `/admin/users/${created.data.data.id}`, SA, { email: `sunil${u}@gmail.com` });
  rec('AD-06', 'Super Admin', 'Change email to one already used', '409', taken.status, taken.status === 409);
  const tokBefore = emLogin.data.data.token;
  const del = await call('DELETE', `/admin/users/${created.data.data.id}`, SA);
  const afterDel = await call('GET', '/leads', tokBefore);
  rec('AD-07', 'Super Admin', 'Delete any company\'s staff; their session stops', '200 then 401', `${del.status} ${afterDel.status}`, del.status === 200 && afterDel.status === 401);
  const lim = await call('PATCH', `/admin/users/${other.data.data.user.id}/staff-limit`, SA, { staff_limit: 5 });
  rec('AD-08', 'Super Admin', 'Change any owner\'s staff limit', '200', lim.status, lim.status === 200);

  // 7. Keep-alive self ping reaches /health
  let hits = 0;
  const pingSrv = http.createServer((req, res) => { if (req.url.startsWith('/health')) hits++; res.end('{}'); });
  await new Promise((r) => pingSrv.listen(0, '127.0.0.1', r));
  process.env.KEEPALIVE_URL = `http://127.0.0.1:${pingSrv.address().port}`;
  const ka = await require('../services/keepAlive.service').pingSelf();
  rec('KA-01', 'Server', 'Keep-alive pings its own /health', '1 hit', `${ka.ok} hits=${hits}`, ka.ok && hits === 1);
  const hb = await require('../services/keepAlive.service').dbHeartbeat();
  rec('KA-02', 'Server', 'DB heartbeat is skipped safely when no database is connected', 'skipped', JSON.stringify(hb), hb.skipped === true);
  pingSrv.close();

  server.close();
  const fails = results.filter((x) => x.result === 'FAIL');
  console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 66), actual: x.actual.slice(0, 50) })));
  console.log(`ADMIN TOOLS / EMAILS / KEEP-ALIVE: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
