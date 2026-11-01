/**
 * Tests: built-in 3D avatars and uploaded profile photos (upload, serve, validation, storage, cleanup).
 *   node src/scripts/avatar-test.js
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdm1n!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'avatar_test_secret';

const http = require('http');
const app = require('../app');
const { dataStore } = require('../repositories/dataStore');
const { tenantFootprint, clearUsageCache } = require('../utils/usage');

let ORIGIN = '';
let BASE = '';
const results = [];
const call = async (method, path, token, body) => {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
};
const rec = (id, who, scenario, expected, actual, pass) => results.push({ id, who, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const u = Date.now();
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const png = `data:image/png;base64,${PNG}`;

(async () => {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  ORIGIN = `http://127.0.0.1:${server.address().port}`;
  BASE = `${ORIGIN}/api/v1`;
  const SA = (await call('POST', '/auth/admin-login', null, { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD })).data.data.token;
  const reg = await call('POST', '/auth/register', null, { name: 'Avatar Owner', email: `avowner${u}@t.com`, password: 'Owner123', company_name: 'Avatar Co' });
  const OWN = reg.data.data.token;
  const OWNid = reg.data.data.user.id;

  // Upload + serve
  const up = await call('POST', '/avatars', OWN, { data_url: png });
  const url = up.data?.data?.url || '';
  rec('AV-01', 'Owner', 'Upload a PNG photo', '201 + /api/v1/avatars/av_…', `${up.status} ${url}`, up.status === 201 && /^\/api\/v1\/avatars\/av_[a-f0-9]{24}$/.test(url));
  const img = await fetch(ORIGIN + url);
  const buf = Buffer.from(await img.arrayBuffer());
  rec('AV-02', 'Anyone', 'Photo loads without login (for <img>), cached, correct type', '200 image/png immutable', `${img.status} ${img.headers.get('content-type')} ${img.headers.get('cache-control')}`,
    img.status === 200 && img.headers.get('content-type') === 'image/png' && /immutable/.test(img.headers.get('cache-control') || '') && buf.equals(Buffer.from(PNG, 'base64')));
  const nf = await fetch(`${BASE}/avatars/av_${'0'.repeat(24)}`);
  const bad = await fetch(`${BASE}/avatars/..%2F..%2Fpackage.json`);
  rec('AV-03', 'Anyone', 'Unknown or malformed photo id', '404 / 404', `${nf.status} / ${bad.status}`, nf.status === 404 && bad.status === 404);

  // Rejections
  const noAuth = await call('POST', '/avatars', null, { data_url: png });
  rec('AV-04', 'Visitor', 'Upload without login', '401', noAuth.status, noAuth.status === 401);
  const fake = await call('POST', '/avatars', OWN, { data_url: `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}` });
  rec('AV-05', 'Owner', 'HTML/script disguised as a PNG', '400', fake.status, fake.status === 400);
  const svg = await call('POST', '/avatars', OWN, { data_url: `data:image/svg+xml;base64,${Buffer.from('<svg onload="alert(1)"/>').toString('base64')}` });
  rec('AV-06', 'Owner', 'SVG upload (can carry scripts)', '400', svg.status, svg.status === 400);
  const big = await call('POST', '/avatars', OWN, { data_url: `data:image/png;base64,${Buffer.concat([Buffer.from(PNG, 'base64'), Buffer.alloc(150 * 1024)]).toString('base64')}` });
  rec('AV-07', 'Owner', 'Very large photo', '413', big.status, big.status === 413);
  const notStr = await call('POST', '/avatars', OWN, { data_url: { x: 1 } });
  rec('AV-08', 'Owner', 'Upload with a non-text value', '400', notStr.status, notStr.status === 400);

  // Using avatars on staff and profiles
  const preset = await call('POST', '/admin/users', OWN, { name: 'Preset Staff', email: `preset${u}@t.com`, password: 'Staff123', avatar_url: '/avatars/03-man-technologist.png' });
  rec('AV-09', 'Owner', 'Create staff with a built-in 3D avatar', '201', `${preset.status} ${preset.data?.data?.avatar_url}`, preset.status === 201 && preset.data.data.avatar_url === '/avatars/03-man-technologist.png');
  const withUpload = await call('POST', '/admin/users', OWN, { name: 'Photo Staff', email: `photo${u}@t.com`, password: 'Staff123', avatar_url: url });
  rec('AV-10', 'Owner', 'Create staff with an uploaded photo', '201', `${withUpload.status}`, withUpload.status === 201 && withUpload.data.data.avatar_url === url);
  const staffLogin = await call('POST', '/auth/login', null, { email: `photo${u}@t.com`, password: 'Staff123' });
  const ST = staffLogin.data?.data?.token;
  const stUp = await call('POST', '/avatars', ST, { data_url: png });
  const stRec = (dataStore.avatars || []).find((a) => stUp.data?.data?.id === a.id);
  rec('AV-11', 'Staff', 'Staff uploads own photo; it is counted under the owner\'s company', '201, owner_id = owner', `${stUp.status} ${stRec && stRec.owner_id === OWNid}`, stUp.status === 201 && stRec && stRec.owner_id === OWNid);
  const prof = await call('PATCH', '/auth/profile', ST, { avatar_url: stUp.data.data.url });
  rec('AV-12', 'Staff', 'Save the uploaded photo on own profile', '200', prof.status, prof.status === 200);
  const editPreset = await call('PATCH', `/admin/users/${preset.data.data.id}`, OWN, { avatar_url: '/avatars/07-man-wearing-turban.png' });
  rec('AV-13', 'Owner', 'Change a staff avatar to another 3D avatar', '200', editPreset.status, editPreset.status === 200);

  const badUrls = ['javascript:alert(1)', 'http://evil.example/x.png', '/avatars/../../etc/passwd', `data:image/png;base64,${PNG}`, '/api/v1/avatars/av_123'];
  const st1 = [];
  for (const v of badUrls) st1.push((await call('PATCH', '/auth/profile', OWN, { avatar_url: v })).status);
  rec('AV-14', 'Owner', 'Profile photo with script/http/path-trick/data/fake links', 'all 400', st1.join(','), st1.every((s) => s === 400));
  const st2 = (await call('POST', '/admin/users', OWN, { name: 'Bad', email: `bad${u}@t.com`, password: 'Staff123', avatar_url: 'javascript:alert(1)' })).status;
  const st3 = (await call('PATCH', `/admin/users/${preset.data.data.id}`, SA, { avatar_url: 'http://evil.example/x.png' })).status;
  rec('AV-15', 'Owner / Super Admin', 'Staff create/edit with a bad avatar link', '400 / 400', `${st2} / ${st3}`, st2 === 400 && st3 === 400);
  const https = await call('PATCH', '/auth/profile', OWN, { avatar_url: 'https://example.com/me.jpg' });
  rec('AV-16', 'Owner', 'An https:// photo link still works', '200', https.status, https.status === 200);

  // Storage + cleanup
  clearUsageCache();
  const owner = dataStore.users.find((x) => x.id === OWNid);
  const fp = tenantFootprint(owner);
  rec('AV-17', 'Owner', 'Uploaded photos count in company storage (owner + staff upload)', '2 photos', fp.groups.avatars.length, fp.groups.avatars.length === 2);
  const unused = (await call('POST', '/avatars', OWN, { data_url: png })).data.data.id;
  dataStore.avatars.forEach((a) => { if (a.owner_id === OWNid) a.created_at = new Date(Date.now() - 3 * 86400000).toISOString(); });
  await call('POST', '/avatars', OWN, { data_url: png });
  const left = dataStore.avatars.filter((a) => a.owner_id === OWNid).map((a) => a.id);
  // `url` was replaced on Photo Staff's profile, so nobody uses it any more; the staff's new photo is in use
  rec('AV-18', 'Server', 'Old unused uploads are removed, photos in use are kept', 'unused gone, in-use kept',
    `${!left.includes(unused)} ${!left.includes(url.split('/').pop())} ${left.includes(stUp.data.data.id)}`, !left.includes(unused) && !left.includes(url.split('/').pop()) && left.includes(stUp.data.data.id));

  server.close();
  const fails = results.filter((x) => x.result === 'FAIL');
  console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 66), actual: x.actual.slice(0, 50) })));
  console.log(`AVATARS / PHOTO UPLOAD: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
