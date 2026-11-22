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

  // 6b. Help video library: platform admin adds links, everyone watches, staff do not get owner-only videos
  const othStaffEmail = `vidstaff${u}@t.com`;
  await call('POST', '/admin/users', OTH, { name: 'Video Staff', email: othStaffEmail, password: 'Staff123' });
  const OTHSTAFF = (await login(othStaffEmail, 'Staff123')).data.data.token;
  const ownerAdd = await call('POST', '/admin/help-videos', OTH, { title: 'x', url: 'https://youtu.be/abc', section: 'Leads' });
  rec('HV-01', 'Owner', 'Owner tries to add a help video', '403', ownerAdd.status, ownerAdd.status === 403);
  const badUrl = await call('POST', '/admin/help-videos', SA, { title: 'Bad link', url: 'javascript:alert(1)', section: 'Leads' });
  const badSection = await call('POST', '/admin/help-videos', SA, { title: 'Bad section', url: 'https://youtu.be/abc', section: 'Nope' });
  rec('HV-02', 'Super Admin', 'Unsafe link or unknown section is refused', '400 + 400', `${badUrl.status} ${badSection.status}`, badUrl.status === 400 && badSection.status === 400);
  const v1 = await call('POST', '/admin/help-videos', SA, { title: 'How to import leads', url: 'https://www.youtube.com/watch?v=abc123', section: 'Bulk Import', keywords: 'CSV, upload', duration: '3:20' });
  const v2 = await call('POST', '/admin/help-videos', SA, { title: 'How to raise the staff limit', url: 'https://youtu.be/xyz789', section: 'Staff & storage', audience: 'owners' });
  rec('HV-03', 'Super Admin', 'Add two videos (one for owners only)', '201 + 201', `${v1.status} ${v2.status}`, v1.status === 201 && v2.status === 201 && v1.data.data.keywords.join() === 'csv,upload');
  const ownerSees = (await call('GET', '/support/videos', OTH)).data.data.map((v) => v.title);
  const staffSees = (await call('GET', '/support/videos', OTHSTAFF)).data.data.map((v) => v.title);
  rec('HV-04', 'Owner / Staff', 'Owner sees both, staff do not see the owner-only video', '2 and 1', `${ownerSees.length} and ${staffSees.length}`, ownerSees.length === 2 && staffSees.length === 1 && staffSees[0] === 'How to import leads');
  const upd = await call('PATCH', `/admin/help-videos/${v1.data.data.id}`, SA, { title: 'Import leads from a CSV file' });
  const delV = await call('DELETE', `/admin/help-videos/${v2.data.data.id}`, SA);
  const afterV = (await call('GET', '/support/videos', OTH)).data.data.map((v) => v.title);
  rec('HV-05', 'Super Admin', 'Rename one video and delete the other', 'one left, renamed', afterV.join(' | '), upd.status === 200 && delV.status === 200 && afterV.length === 1 && afterV[0] === 'Import leads from a CSV file');
  const noLogin = await call('GET', '/support/videos', null);
  rec('HV-06', 'Public', 'Help videos need a login', '401', noLogin.status, noLogin.status === 401);

  // 6c. Storage by team member (owner only)
  await call('POST', '/leads', OTHSTAFF, { company_name: 'Staff storage buyer', follow_up_date: today, today_remarks: 'r', next_follow_up_action: 'n' });
  const usageM = await call('GET', '/admin/my-usage?members=1', OTH);
  const mem = usageM.data?.data?.members || [];
  const staffRow = mem.find((m) => m.name === 'Video Staff');
  const shareSum = mem.reduce((t, m) => t + m.share_percent, 0);
  rec('SU-01', 'Owner', 'Storage is split per team member', 'owner + staff rows, shares add to ~100', `${mem.length} rows, staff leads=${staffRow?.leads}, sum=${shareSum.toFixed(0)}`, usageM.status === 200 && mem.length >= 2 && mem.some((m) => m.role === 'Owner') && staffRow && staffRow.leads === 1 && staffRow.used_bytes > 0 && Math.abs(shareSum - 100) < 1 && mem.every((m) => m.email === undefined));
  const usagePlain = await call('GET', '/admin/my-usage', OTH);
  rec('SU-02', 'Owner', 'Plain usage call stays small (no member list)', 'no members', String(usagePlain.data?.data?.members), usagePlain.status === 200 && usagePlain.data.data.members === undefined);
  const staffUsage = await call('GET', '/admin/my-usage?members=1', OTHSTAFF);
  rec('SU-03', 'Staff', 'Staff cannot open the storage breakdown', '403', staffUsage.status, staffUsage.status === 403);

  // 6d. Shipping cost sheets: owner sees everything; staff see shipments and tasks but no costs unless allowed
  // Same example as the company's "Quotation Calculator" sheet: FOB 145.28, CFR 161.28, CIF 163.45 USD per ton
  const sheetBody = {
    name: 'CI Saigon CIF', buyer: 'Saigon Feed Mill', product: 'Corn DDGS', term: 'CIF', quote_unit: 'ton',
    container: { type: '20 ft', tons_per: 25, count: 2, bags_per: 500 }, currency: { local: 'INR', foreign: 'USD', rate: 95 },
    price_per_kg: 10, transport_per_kg: 1, profit_pct: 3,
    costs: { customs_per_container: 60000, freight_per_container: 400, insurance_per_container: 5000 },
    commission: { agent_pct: 2, consultant_pct: 1, sales_pct: 0.5 }, tax_pct: 25,
    quote: { fob: 1, cfr: 1, cif: 1 },
    tasks: [{ title: 'Container booking', person_id: '', tat_days: 2 }], evil: '<script>',
  };
  const shipCreated = await call('PUT', '/shipping/sheets/new', OTH, sheetBody);
  const sid = shipCreated.data?.data?.id;
  const q0 = shipCreated.data?.data?.quote || {};
  rec('SH-01', 'Owner', 'Owner creates a cost sheet; the server works out the sheet quote (a sent quote is ignored)', '201, 145.28/161.28/163.45', `${shipCreated.status} ${q0.fob}/${q0.cfr}/${q0.cif} ${shipCreated.data?.data?.evil}`, shipCreated.status === 201 && q0.fob === 145.28 && q0.cfr === 161.28 && q0.cif === 163.45 && shipCreated.data.data.price_per_kg === 10 && shipCreated.data.data.evil === undefined && shipCreated.data.data.tasks.length === 1);
  const staffView = await call('GET', '/shipping', OTHSTAFF);
  const sv = (staffView.data?.data || []).find((x) => x.id === sid) || {};
  rec('SH-02', 'Staff', 'Staff (default) see the quote but no costs, profit, commissions or tax', 'quote 163.45, no money keys', `${staffView.status} ${sv.quote?.cif} ${Object.keys(sv).filter((k) => ['price_per_kg', 'transport_per_kg', 'costs', 'profit_pct', 'commission', 'tax_pct'].includes(k)).join(',') || 'none'}`, staffView.status === 200 && sv.name === 'CI Saigon CIF' && sv.quote?.cif === 163.45 && sv.costs === undefined && sv.price_per_kg === undefined && sv.profit_pct === undefined && staffView.data.meta.can_see_money === false);
  const staffEdit = await call('PUT', `/shipping/sheets/${sid}`, OTHSTAFF, { ...sv, term: 'FOB', price_per_kg: 1, profit_pct: 50, costs: { customs_per_container: 0 } });
  const ownerAfter = ((await call('GET', '/shipping', OTH)).data?.data || []).find((x) => x.id === sid) || {};
  rec('SH-03', 'Staff', 'Staff can change the term but not the hidden costs; the quote stays right', 'FOB, 10/kg, 3%, 145.28', `${staffEdit.status} ${ownerAfter.term} ${ownerAfter.price_per_kg} ${ownerAfter.profit_pct} ${ownerAfter.quote?.fob}`, staffEdit.status === 200 && ownerAfter.term === 'FOB' && ownerAfter.price_per_kg === 10 && ownerAfter.profit_pct === 3 && ownerAfter.costs.customs_per_container === 60000 && ownerAfter.quote.fob === 145.28);
  // A sheet saved before the new formula is read with the new fields
  const shipStore = dataStore.appSettings.find((x) => x.id === `shipping:${shipCreated.data.data.created_by_id}`);
  shipStore.sheets.push({ id: 'ship_old_ci', name: 'Old sheet', container: { type: '20 ft', tons_per: 25, count: 2 }, currency: { local: 'INR', foreign: 'USD', rate: 95 }, purchase_per_ton: 11000, deduction_per_ton: 0, costs: { customs: 60000, local_charges: 0, agency: 60000, freight_per_container: 400, insurance_pct: 0 }, target_margin_pct: 3, tasks: [], updated_at: new Date().toISOString() });
  const oldRead = ((await call('GET', '/shipping', OTH)).data?.data || []).find((x) => x.id === 'ship_old_ci') || {};
  rec('SH-08', 'Owner', 'A cost sheet saved with the old fields opens with the new ones', '11/kg, 60,000/container, FOB 145.28', `${oldRead.price_per_kg} ${oldRead.costs?.customs_per_container} ${oldRead.quote?.fob}`, oldRead.price_per_kg === 11 && oldRead.costs?.customs_per_container === 60000 && oldRead.quote?.fob === 145.28);
  shipStore.sheets = shipStore.sheets.filter((x) => x.id !== 'ship_old_ci');
  const staffDel = await call('DELETE', `/shipping/sheets/${sid}`, OTHSTAFF);
  const staffSet = await call('PUT', '/shipping/settings', OTHSTAFF, { staff_access: 'full' });
  rec('SH-04', 'Staff', 'Staff cannot delete sheets or change who sees Shipping', '403 + 403', `${staffDel.status} ${staffSet.status}`, staffDel.status === 403 && staffSet.status === 403);
  await call('PUT', '/shipping/settings', OTH, { staff_access: 'full' });
  const fullView = ((await call('GET', '/shipping', OTHSTAFF)).data?.data || []).find((x) => x.id === sid) || {};
  await call('PUT', '/shipping/settings', OTH, { staff_access: 'none' });
  const noneView = await call('GET', '/shipping', OTHSTAFF);
  rec('SH-05', 'Owner', 'Owner can give staff full access, or none', 'costs visible, then 403', `${fullView.price_per_kg} ${noneView.status}`, fullView.price_per_kg === 10 && noneView.status === 403);
  const otherCo = await call('GET', '/shipping', NEW);
  rec('SH-06', 'Other company', 'Another company never sees these sheets', '0 sheets', (otherCo.data?.data || []).length, otherCo.status === 200 && !(otherCo.data.data || []).some((x) => x.id === sid));
  const shipDel = await call('DELETE', `/shipping/sheets/${sid}`, OTH);
  rec('SH-07', 'Owner', 'Owner deletes the sheet', '200', shipDel.status, shipDel.status === 200);

  // 6c. Calculators the platform admin builds (boxes + formulas) shown in the CRM
  const calcRows = [
    { key: 'tons', label: 'Tons', kind: 'number', default: 25 },
    { key: 'unit', label: 'Ton/kg', kind: 'select', options: [{ label: 'Ton', value: 1000 }, { label: 'Kg', value: 1 }] },
    { key: 'total', label: 'Total', kind: 'formula', formula: 'tons * unit', highlight: true, decimals: 2, evil: '<script>' },
  ];
  const calcAll = await call('POST', '/admin/calculators', SA, { name: 'CI calc for all', rows: calcRows });
  const calcOne = await call('POST', '/admin/calculators', SA, { name: 'CI calc only Other', rows: calcRows, audience: 'companies', company_ids: [other.data.data.user.id] });
  const savedRow = calcAll.data?.data?.rows?.[2] || {};
  rec('CA-01', 'Super Admin', 'Admin creates calculators (unknown fields dropped)', '201 + 201, no evil', `${calcAll.status} ${calcOne.status} ${savedRow.evil}`, calcAll.status === 201 && calcOne.status === 201 && savedRow.evil === undefined && savedRow.formula === 'tons * unit');
  const calc_othList = ((await call('GET', '/shipping/calculators', OTH)).data?.data || []).map((c) => c.name);
  const calc_newList = ((await call('GET', '/shipping/calculators', NEW)).data?.data || []).map((c) => c.name);
  const calc_staffList = ((await call('GET', '/shipping/calculators', OTHSTAFF)).data?.data || []).map((c) => c.name);
  rec('CA-02', 'Owner / Staff / Other company', 'Picked company and its staff see both; another company sees only the "all" one', 'Other 2, staff 2, New 1', `${calc_othList.filter((n) => n.startsWith('CI calc')).length} ${calc_staffList.filter((n) => n.startsWith('CI calc')).length} ${calc_newList.filter((n) => n.startsWith('CI calc')).length}`, calc_othList.includes('CI calc only Other') && calc_staffList.includes('CI calc only Other') && calc_newList.includes('CI calc for all') && !calc_newList.includes('CI calc only Other'));
  const calc_leak = ((await call('GET', '/shipping/calculators', OTH)).data?.data || []).find((c) => c.name === 'CI calc only Other') || {};
  rec('CA-03', 'Owner', 'Companies do not get the list of other companies a calculator is for', 'no company_ids', 'company_ids' in calc_leak ? 'leaked' : 'hidden', !('company_ids' in calc_leak));
  const calc_ownerTry = await call('POST', '/admin/calculators', OTH, { name: 'x', rows: calcRows });
  const calc_badRows = await call('POST', '/admin/calculators', SA, { name: 'Bad', rows: [{ key: 'a', label: 'A', kind: 'number' }, { key: 'a', label: 'B', kind: 'number' }] });
  const calc_noRows = await call('POST', '/admin/calculators', SA, { name: 'Empty', rows: [] });
  const calc_noCompany = await call('POST', '/admin/calculators', SA, { name: 'Nobody', rows: calcRows, audience: 'companies', company_ids: [] });
  rec('CA-04', 'Owner / Super Admin', 'Owners cannot build calculators; duplicate box names, no rows, no company picked are refused', '403 400 400 400', `${calc_ownerTry.status} ${calc_badRows.status} ${calc_noRows.status} ${calc_noCompany.status}`, calc_ownerTry.status === 403 && calc_badRows.status === 400 && calc_noRows.status === 400 && calc_noCompany.status === 400);
  const calc_hide = await call('PATCH', `/admin/calculators/${calcAll.data.data.id}`, SA, { active: false });
  const calc_afterHide = ((await call('GET', '/shipping/calculators', NEW)).data?.data || []).map((c) => c.name);
  rec('CA-05', 'Super Admin', 'A hidden calculator disappears from the CRM', 'hidden', `${calc_hide.status} ${calc_afterHide.includes('CI calc for all') ? 'still shown' : 'hidden'}`, calc_hide.status === 200 && !calc_afterHide.includes('CI calc for all'));
  const calc_delA = await call('DELETE', `/admin/calculators/${calcAll.data.data.id}`, SA);
  const calc_delB = await call('DELETE', `/admin/calculators/${calcOne.data.data.id}`, SA);
  const calcCur = await call('POST', '/admin/calculators', SA, { name: 'CI currency calc', rows: [
    { key: 'local_currency', label: 'Local value in currency', kind: 'currency', role: 'local', default: 'aed', unit: 'x' },
    { key: 'quote_currency', label: 'Share quote in currency', kind: 'currency', role: 'quote', default: 'EURO' },
    { key: 'amt', label: 'Amount', kind: 'number', default: 100 },
    { key: 'res', label: 'Result', kind: 'formula', formula: 'amt / fx', unit: '{quote}/MT' },
  ] });
  const cr = calcCur.data?.data?.rows || [];
  const calcTwoLocal = await call('POST', '/admin/calculators', SA, { name: 'Two locals', rows: [
    { key: 'a', label: 'A', kind: 'currency', role: 'local', default: 'INR' }, { key: 'b', label: 'B', kind: 'currency', role: 'local', default: 'AED' },
  ] });
  const calcFxName = await call('POST', '/admin/calculators', SA, { name: 'fx name', rows: [{ key: 'fx', label: 'Fx', kind: 'number', default: 1 }] });
  rec('CA-07', 'Super Admin', 'Currency boxes are saved (role, 3-letter code); two Local boxes or a box named fx are refused', '201 local:AED quote:EUR {quote}/MT, 400 400',
    `${calcCur.status} ${cr[0]?.role}:${cr[0]?.default} ${cr[1]?.role}:${cr[1]?.default} ${cr[3]?.unit}, ${calcTwoLocal.status} ${calcFxName.status}`,
    calcCur.status === 201 && cr[0]?.role === 'local' && cr[0]?.default === 'AED' && cr[1]?.role === 'quote' && cr[1]?.default === 'EUR' && cr[3]?.unit === '{quote}/MT' && calcTwoLocal.status === 400 && calcFxName.status === 400);
  if (calcCur.data?.data?.id) await call('DELETE', `/admin/calculators/${calcCur.data.data.id}`, SA);
  rec('CA-06', 'Super Admin', 'Admin deletes calculators', '200 200', `${calc_delA.status} ${calc_delB.status}`, calc_delA.status === 200 && calc_delB.status === 200);

  // 6b. Admin announcements: popup choice, late joiners, privacy of the read list
  const annHigh = await call('POST', '/admin/notifications', SA, { target: 'all_owners', title: `CI notice ${u}`, message: 'Prices change on 1 Dec.', type: 'info', priority: 'high' });
  const annBell = await call('POST', '/admin/notifications', SA, { target: 'all_owners', title: `CI bell ${u}`, message: 'Bell only.', type: 'info', priority: 'normal' });
  const annOdd = await call('POST', '/admin/notifications', SA, { target: 'all_owners', title: `CI odd ${u}`, message: 'x', priority: 'urgent!!' });
  rec('AN-01', 'Admin', 'Announcement keeps the popup/bell choice (unknown value = popup)', 'high normal high', `${annHigh.data?.data?.priority} ${annBell.data?.data?.priority} ${annOdd.data?.data?.priority}`, annHigh.status === 201 && annHigh.data.data.priority === 'high' && annHigh.data.data.kind === 'announcement' && annBell.data.data.priority === 'normal' && annOdd.data.data.priority === 'high');
  const othList = (await call('GET', '/notifications', OTH)).data?.data || [];
  const othNotice = othList.find((n) => n.title === `CI notice ${u}`);
  rec('AN-02', 'Owner', 'Owner receives it, unread, with no read list of other users', 'is_read false, no read_by', othNotice ? `${othNotice.is_read} ${'read_by' in othNotice}` : 'missing', !!othNotice && othNotice.is_read === false && othList.every((n) => !('read_by' in n)));
  await new Promise((r) => setTimeout(r, 20));
  const late = await call('POST', '/auth/register', null, { name: 'Late Owner', email: `late${u}@t.com`, password: 'Late1234', company_name: 'Late Co' });
  const lateList = (await call('GET', '/notifications', late.data?.data?.token)).data?.data || [];
  rec('AN-03', 'New owner', 'A company that joins later does not get older announcements', 'not listed', lateList.map((n) => n.title).join('|') || 'none', late.status === 201 && !lateList.some((n) => String(n.title).includes(String(u))));
  const read = await call('PATCH', `/notifications/${othNotice?.id}/read`, OTH);
  const again = ((await call('GET', '/notifications', OTH)).data?.data || []).find((n) => n.id === othNotice?.id);
  rec('AN-04', 'Owner', 'After "OK" the notice is read (popup will not repeat), read list hidden', 'true, no read_by', `${read.status} ${again?.is_read} ${'read_by' in (read.data?.data || {})}`, read.status === 200 && again?.is_read === true && !('read_by' in read.data.data));
  for (const a of [annHigh, annBell, annOdd]) if (a.data?.data?.id) await call('DELETE', `/admin/notifications/${a.data.data.id}`, SA);

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
