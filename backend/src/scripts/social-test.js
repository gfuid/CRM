/**
 * Tests: Social Media (Facebook Pages + Instagram, AI writing / pictures, calendar, approval, scheduler)
 * against FAKE Meta and FAKE AI servers. Nothing is posted anywhere and no AI account is used.
 *   node src/scripts/social-test.js
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdm1n!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'social_test_secret';
process.env.META_APP_ID = 'APP123';
process.env.META_APP_SECRET = 'APPSECRET';

const http = require('http');

// ---------- fake Meta Graph API ----------
const fb = { posts: [], ig: [], igContainers: {}, expiredPage: false };
const PAGE_TOKEN = 'PAGE_TOKEN_1';
const metaFake = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const q = url.searchParams;
    const form = Object.fromEntries(new URLSearchParams(body));
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const p = url.pathname;
    if (p === '/oauth/access_token') {
      if (q.get('client_secret') !== 'APPSECRET') return send(400, { error: { message: 'bad secret' } });
      if (q.get('code')) return q.get('code') === 'GOOD_CODE' ? send(200, { access_token: 'SHORT_USER' }) : send(400, { error: { message: 'This authorization code has expired.', code: 100 } });
      return send(200, { access_token: 'LONG_USER' });
    }
    if (p === '/me/accounts') {
      if (q.get('access_token') !== 'LONG_USER') return send(401, { error: { message: 'bad user token', code: 190 } });
      return send(200, { data: [{ id: '5001', name: 'Nova Agro Exports', access_token: PAGE_TOKEN, picture: { data: { url: 'https://x/p.jpg' } }, instagram_business_account: { id: '1784', username: 'novaagro', profile_picture_url: 'https://x/i.jpg' } }] });
    }
    const tok = q.get('access_token');
    if (tok !== PAGE_TOKEN || fb.expiredPage) return send(400, { error: { message: 'Error validating access token: Session has expired', code: 190 } });
    if (req.method === 'POST' && p === '/5001/feed') { fb.posts.push({ kind: 'feed', ...form }); return send(200, { id: `5001_${fb.posts.length}` }); }
    if (req.method === 'POST' && p === '/5001/photos') { fb.posts.push({ kind: 'photo', ...form }); return send(200, { id: `ph${fb.posts.length}`, post_id: `5001_${fb.posts.length}` }); }
    if (req.method === 'GET' && /^\/5001_\d+$/.test(p)) return send(200, { permalink_url: `https://facebook.com${p}` });
    if (req.method === 'POST' && p === '/1784/media') { const id = `c${Object.keys(fb.igContainers).length + 1}`; fb.igContainers[id] = form; return send(200, { id }); }
    if (req.method === 'GET' && /^\/c\d+$/.test(p)) return send(200, { status_code: 'FINISHED' });
    if (req.method === 'POST' && p === '/1784/media_publish') { fb.ig.push(fb.igContainers[form.creation_id]); return send(200, { id: `ig${fb.ig.length}` }); }
    if (req.method === 'GET' && /^\/ig\d+$/.test(p)) return send(200, { permalink: `https://instagram.com/p${p}` });
    return send(404, { error: { message: `fake meta: no route ${req.method} ${p}` } });
  });
});

// ---------- fake AI providers (OpenAI-style, Anthropic Messages API) ----------
const aiLog = [];
const POST_JSON = JSON.stringify({ facebook: 'New crop turmeric is ready for export. Curcumin 3%+, 25 kg bags. Ask us for a CIF price.', instagram: 'Fresh turmeric is here 🌿\n#turmeric #export', image_idea: 'Turmeric fingers in a jute bag' });
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(400, 7)]);
const aiFake = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const b = body ? JSON.parse(body) : {};
    aiLog.push({ path: req.url, headers: req.headers, body: b });
    if (req.url === '/v1/messages') {
      if (req.headers['x-api-key'] !== 'sk-ant-GOOD' && req.headers.authorization !== 'Bearer sk-ant-GOOD') return send(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
      const text = /Say OK/.test(JSON.stringify(b.messages)) ? 'OK' : /plan a month/.test(String(b.system)) ? JSON.stringify({ ideas: [{ date: '2030-03-04', title: 'Harvest update', brief: 'Show the new crop', platforms: ['facebook', 'instagram'] }, { date: '2030-03-11', title: 'Lab report', brief: 'Curcumin test', platforms: ['facebook'] }] }) : POST_JSON;
      return send(200, { id: 'msg_1', type: 'message', role: 'assistant', model: b.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 20 } });
    }
    if (req.url === '/openai/chat/completions') {
      if (req.headers.authorization !== 'Bearer sk-OPENAI') return send(401, { error: { message: 'Incorrect API key provided' } });
      return send(200, { choices: [{ message: { role: 'assistant', content: POST_JSON } }] });
    }
    if (req.url === '/openai/images/generations') {
      if (req.headers.authorization !== 'Bearer sk-OPENAI') return send(401, { error: { message: 'Incorrect API key provided' } });
      return send(200, { data: [{ b64_json: PNG.toString('base64') }] });
    }
    return send(404, { error: { message: `fake ai: ${req.url}` } });
  });
});

let BASE = '';
const results = [];
const rec = (id, who, scenario, expected, actual, pass) => results.push({ id, who, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const u = Date.now();

(async () => {
  await new Promise((r) => metaFake.listen(0, '127.0.0.1', r));
  await new Promise((r) => aiFake.listen(0, '127.0.0.1', r));
  process.env.META_GRAPH_BASE = `http://127.0.0.1:${metaFake.address().port}`;
  process.env.META_OAUTH_DIALOG = 'https://www.facebook.com/v21.0/dialog/oauth';
  process.env.AI_ANTHROPIC_BASE = `http://127.0.0.1:${aiFake.address().port}`;
  process.env.AI_OPENAI_BASE = `http://127.0.0.1:${aiFake.address().port}/openai`;
  const app = require('../app');
  const { dataStore } = require('../repositories/dataStore');
  const sm = require('../controllers/social.controller');
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`;
  BASE = `${ORIGIN}/api/v1`;
  const call = async (method, path, token, body) => {
    const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };
  const reg = async (name) => {
    const r = await call('POST', '/auth/register', null, { name, email: `${name.toLowerCase()}${u}@t.com`, password: 'Owner123', company_name: `${name} Exports` });
    return { token: r.data.data.token, id: r.data.data.user.id };
  };
  const A = await reg('Ravi');
  const B = await reg('Bina');
  const st = (await call('POST', '/admin/users', A.token, { name: 'Sona', email: `sona${u}@t.com`, password: 'Staff123' })).data.data;
  const ST = (await call('POST', '/auth/login', null, { email: `sona${u}@t.com`, password: 'Staff123' })).data.data.token;
  const SA = (await call('POST', '/auth/admin-login', null, { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD })).data.data.token;

  // 1. Locked until the admin switches it on
  const locked = await call('GET', '/social/posts', A.token);
  const st0 = (await call('GET', '/social/status', A.token)).data.data;
  await call('PATCH', `/admin/users/${A.id}/features`, SA, { social_media: true });
  const st1 = (await call('GET', '/social/status', A.token)).data.data;
  rec('SM-01', 'Owner / Admin', 'Social Media is locked until the platform admin switches it on', '403 then enabled + Meta ready', `${locked.status} ${locked.data?.code} / ${st0.enabled} -> ${st1.enabled} meta=${st1.meta_ready}`, locked.status === 403 && locked.data.code === 'FEATURE_DISABLED' && !st0.enabled && st1.enabled && st1.meta_ready);

  // 2. Staff need the owner's permission; staff never connect accounts
  const sNo = await call('GET', '/social/posts', ST);
  await call('PATCH', `/admin/users/${st.id}`, A.token, { permissions: { social_media: true } });
  const sYes = await call('GET', '/social/posts', ST);
  const sConn = await call('POST', '/social/connect/meta', ST);
  rec('SM-02', 'Staff', 'Staff need the owner\'s "Social Media" permission; they cannot connect accounts', '403 / 200 / 403', `${sNo.status} / ${sYes.status} / ${sConn.status}`, sNo.status === 403 && sYes.status === 200 && sConn.status === 403);

  // 3. Facebook login
  const start = (await call('POST', '/social/connect/meta', A.token)).data.data;
  const lu = new URL(start.url);
  const state = lu.searchParams.get('state');
  rec('SM-03', 'Owner', 'Connect opens Facebook login with our app, the return address, the permissions and a signed state', 'client_id, redirect, scopes', `${lu.searchParams.get('client_id')} ${lu.searchParams.get('redirect_uri')?.endsWith('/api/v1/social/oauth/callback')} ${lu.searchParams.get('scope')?.includes('instagram_content_publish')}`, lu.searchParams.get('client_id') === 'APP123' && lu.searchParams.get('redirect_uri').endsWith('/api/v1/social/oauth/callback') && lu.searchParams.get('scope').includes('pages_manage_posts') && Boolean(state));
  const cb = (qs) => fetch(`${ORIGIN}/api/v1/social/oauth/callback?${qs}`, { redirect: 'manual' });
  const forged = await cb(`code=GOOD_CODE&state=${encodeURIComponent(state.split('.')[0] + '.AAAA')}`);
  const cancelled = await cb(`error=access_denied&error_description=${encodeURIComponent('User cancelled')}&state=${encodeURIComponent(state)}`);
  const good = await cb(`code=GOOD_CODE&state=${encodeURIComponent(state)}`);
  const loc = (r) => { const l = r.headers.get('location') || ''; try { return [...new URL(l).searchParams].map(([k, v]) => `${k}=${v}`).join('&'); } catch { return l; } };
  rec('SM-04', 'Facebook', 'A forged state or a cancelled login is refused; a real login comes back connected', 'error / error / connected n=2', `${loc(forged).includes('social=error')} ${loc(cancelled).includes('cancelled')} ${loc(good)}`, forged.status === 302 && loc(forged).includes('social=error') && loc(cancelled).includes('User cancelled') && loc(good).includes('social=connected') && loc(good).includes('n=2'));
  const accounts = (await call('GET', '/social/accounts', A.token)).data.data;
  const fbAcc = accounts.find((a) => a.platform === 'facebook');
  const igAcc = accounts.find((a) => a.platform === 'instagram');
  rec('SM-05', 'Owner', 'The Page and its Instagram account are saved; the Page token is never sent back', 'facebook + @novaagro, no token', `${accounts.map((a) => a.name).join(', ')} ${JSON.stringify(accounts).includes(PAGE_TOKEN) ? 'LEAKED' : 'hidden'}`, fbAcc && igAcc && igAcc.name === '@novaagro' && !JSON.stringify(accounts).includes(PAGE_TOKEN) && !JSON.stringify(dataStore.waRecords.filter((r) => r.kind === 'social_account')).includes(PAGE_TOKEN));

  // 4. Pictures
  const fakePic = await call('POST', '/social/media', A.token, { data_url: `data:image/png;base64,${Buffer.from('<svg onload=x>').toString('base64')}` });
  const pic = await call('POST', '/social/media', A.token, { data_url: `data:image/png;base64,${PNG.toString('base64')}` });
  const pub = await fetch(`${ORIGIN}/api/v1/social/media/${pic.data?.data?.id}`);
  rec('SM-06', 'Owner', 'A fake picture is refused; a real one is saved and Facebook/Instagram can download it without login', '400 / 201 / 200 image/png', `${fakePic.status} / ${pic.status} / ${pub.status} ${pub.headers.get('content-type')}`, fakePic.status === 400 && pic.status === 201 && pub.status === 200 && pub.headers.get('content-type') === 'image/png');
  const picId = pic.data.data.id;

  // 5. Rules before posting
  const noPicIg = await call('POST', '/social/posts', A.token, { text: 'Hello', account_ids: [igAcc.id], action: 'now' });
  const past = await call('POST', '/social/posts', A.token, { text: 'Hello', account_ids: [fbAcc.id], action: 'schedule', scheduled_at: new Date(Date.now() - 3600e3).toISOString() });
  const noAcc = await call('POST', '/social/posts', A.token, { text: 'Hello', action: 'now' });
  const tooLong = await call('POST', '/social/posts', A.token, { texts: { instagram: 'x'.repeat(2240) }, media_ids: [picId], account_ids: [igAcc.id], action: 'now' });
  rec('SM-07', 'Owner', 'Instagram without a picture, a time in the past, no account, or a caption over 2,200 characters is refused', '400 x4', `${noPicIg.status} ${past.status} ${noAcc.status} ${tooLong.status}`, [noPicIg, past, noAcc, tooLong].every((r) => r.status === 400) && /picture/.test(noPicIg.data.message));

  // 6. Schedule -> scheduler publishes on time to both
  const when = new Date(Date.now() + 3600e3).toISOString();
  const sch = await call('POST', '/social/posts', A.token, { text: 'Turmeric offer', texts: { instagram: 'Turmeric 🌿 #export' }, media_ids: [picId], account_ids: [fbAcc.id, igAcc.id], action: 'schedule', scheduled_at: when });
  await sm.tick();
  const before = fb.posts.length + fb.ig.length;
  const postRec = dataStore.waRecords.find((r) => r.id === sch.data.data.id);
  postRec.scheduled_at = new Date(Date.now() - 1000).toISOString();
  await sm.tick();
  const done = (await call('GET', '/social/posts', A.token)).data.data.find((x) => x.id === sch.data.data.id);
  const lastFb = fb.posts[fb.posts.length - 1] || {};
  const lastIg = fb.ig[fb.ig.length - 1] || {};
  rec('SM-08', 'Scheduler', 'A scheduled post waits for its time, then goes to the Page (photo + text) and Instagram (its own caption)', 'nothing early; posted, 2 links', `${sch.status} early=${before} ${done.status} fb=${lastFb.kind}:${lastFb.caption} ig=${lastIg.caption} links=${done.targets.filter((t) => t.permalink).length}`, sch.status === 201 && sch.data.data.status === 'scheduled' && before === 0 && done.status === 'posted' && lastFb.kind === 'photo' && lastFb.caption === 'Turmeric offer' && /\/api\/v1\/social\/media\//.test(lastFb.url) && lastIg.caption === 'Turmeric 🌿 #export' && done.targets.filter((t) => t.permalink).length === 2);

  // 7. Post now (text only on the Page)
  const now = await call('POST', '/social/posts', A.token, { text: 'Container dispatched to Dubai today.', account_ids: [fbAcc.id], action: 'now' });
  await wait(200);
  const nowDone = dataStore.waRecords.find((r) => r.id === now.data.data.id);
  rec('SM-09', 'Owner', '"Post now" publishes a text post on the Page straight away and says so', 'posted, feed, Posting now', `${now.status} ${nowDone.status} ${fb.posts[fb.posts.length - 1].kind} ${now.data?.message}`, now.status === 201 && now.data.message === 'Posting now…' && nowDone.status === 'posted' && fb.posts[fb.posts.length - 1].kind === 'feed');

  // 8. Staff -> approval
  const sPost = await call('POST', '/social/posts', ST, { text: 'Sample shipped to Lagos', account_ids: [fbAcc.id], action: 'now' });
  await wait(100);
  const stillWaiting = dataStore.waRecords.find((r) => r.id === sPost.data.data.id).status;
  const staffApprove = await call('POST', `/social/posts/${sPost.data.data.id}/approve`, ST);
  const ownerApprove = await call('POST', `/social/posts/${sPost.data.data.id}/approve`, A.token);
  await wait(200);
  const approved = dataStore.waRecords.find((r) => r.id === sPost.data.data.id);
  const stStatus = (await call('GET', '/social/status', A.token)).data.data;
  rec('SM-10', 'Staff / Owner', 'A staff post waits for the owner; staff cannot approve; after approval it is published', 'pending, 403, posted', `${sPost.data.data.status} ${stillWaiting} ${staffApprove.status} ${ownerApprove.status} ${approved.status} by ${approved.approved_by_name}`, sPost.data.data.status === 'pending_approval' && stillWaiting === 'pending_approval' && staffApprove.status === 403 && ownerApprove.status === 200 && approved.status === 'posted' && stStatus.pending_approval === 0);
  const sOther = await call('PUT', `/social/posts/${now.data.data.id}`, ST, { text: 'changed' });
  rec('SM-11', 'Staff', 'Staff cannot change the owner\'s (already published) post', '403', sOther.status, sOther.status === 403);

  // 9. Expired login -> failed, bell note, retry
  fb.expiredPage = true;
  const exp = await call('POST', '/social/posts', A.token, { text: 'Will fail', account_ids: [fbAcc.id], action: 'now' });
  await wait(200);
  const failed = { ...dataStore.waRecords.find((r) => r.id === exp.data.data.id) };
  const accAfter = (await call('GET', '/social/accounts', A.token)).data.data.find((a) => a.id === fbAcc.id);
  const note = dataStore.notifications.find((n) => n.post_id === exp.data.data.id);
  fb.expiredPage = false;
  const retry = await call('POST', `/social/posts/${exp.data.data.id}/retry`, A.token);
  await wait(200);
  const retried = dataStore.waRecords.find((r) => r.id === exp.data.data.id);
  rec('SM-12', 'Owner', 'An expired Facebook login: post failed with a clear reason, account marked, bell note; Retry publishes it', 'failed+expired+note, then posted', `${failed.status === 'posted' ? 'posted?' : 'failed'} ${accAfter.status} note=${Boolean(note)} retry=${retry.status} ${retried.status}`, /Connect the account again/.test(exp.data.data.error || failed.error || (failed.targets[0] || {}).error || '') && accAfter.status === 'expired' && Boolean(note) && retry.status === 200 && retried.status === 'posted');

  // 10. AI with the company's own keys
  const noKey = await call('POST', '/social/ai/write', A.token, { topic: 'Turmeric' });
  const save1 = await call('PUT', '/social/ai', A.token, { providers: { anthropic: { api_key: 'sk-ant-GOOD' }, openai: { api_key: 'sk-OPENAI' } }, text_provider: 'anthropic', image_provider: 'openai' });
  const view = (await call('GET', '/social/ai', A.token)).data.data;
  const staffKeys = await call('GET', '/social/ai', ST);
  rec('SM-13', 'Owner', 'Without a key AI is refused; keys are saved encrypted, never sent back; staff cannot see the AI settings', '400 / has_key, no key text / 403', `${noKey.status} / ${view.providers.anthropic.has_key} ${view.providers.anthropic.key_last4} ${JSON.stringify(view).includes('sk-ant-GOOD') ? 'LEAKED' : 'hidden'} / ${staffKeys.status}`, noKey.status === 400 && save1.status === 200 && view.providers.anthropic.has_key && view.providers.anthropic.key_last4 === 'GOOD' && !JSON.stringify(view).includes('sk-ant-GOOD') && !JSON.stringify(dataStore.waRecords.filter((r) => r.kind === 'social_ai')).includes('sk-ant-GOOD') && staffKeys.status === 403);
  const write = await call('POST', '/social/ai/write', ST, { topic: 'New crop turmeric', platforms: ['facebook', 'instagram'], language: 'English' });
  const lastClaude = aiLog.filter((x) => x.path === '/v1/messages').pop() || {};
  rec('SM-14', 'Staff / Claude', 'AI writes a Facebook and an Instagram version with the company\'s Claude key (official SDK, Opus 5.5 + fallbacks)', 'two texts, claude-opus-5-5', `${write.status} fb=${(write.data?.data?.texts?.facebook || '').slice(0, 20)} ig=${(write.data?.data?.texts?.instagram || '').slice(0, 15)} model=${lastClaude.body?.model} fallbacks=${lastClaude.body?.fallbacks} beta=${lastClaude.headers?.['anthropic-beta']}`, write.status === 200 && /turmeric/i.test(write.data.data.texts.facebook) && /#turmeric/.test(write.data.data.texts.instagram) && lastClaude.body.model === 'claude-opus-5-5' && lastClaude.body.fallbacks === 'default' && String(lastClaude.headers['anthropic-beta']).includes('server-side-fallback-2026-07-01'));
  const ideas = await call('POST', '/social/ai/ideas', A.token, { month: '2030-03', focus: 'turmeric' });
  rec('SM-15', 'Owner', 'AI makes a month plan of post ideas with dates', '2 ideas, dated', `${ideas.status} ${(ideas.data?.data?.ideas || []).map((i) => `${i.date}:${i.title}`).join(' | ')}`, ideas.status === 200 && ideas.data.data.ideas.length === 2 && ideas.data.data.ideas[0].date === '2030-03-04');
  const img = await call('POST', '/social/ai/image', A.token, { prompt: 'Turmeric in a jute bag' });
  const claudeImg = await call('POST', '/social/ai/image', A.token, { prompt: 'x', provider: 'anthropic' });
  const imgGet = img.data?.data?.id ? await fetch(`${ORIGIN}/api/v1/social/media/${img.data.data.id}`) : { status: 0 };
  rec('SM-16', 'Owner / OpenAI', 'AI picture is made with the company\'s OpenAI key and saved; Claude (no pictures) falls back to the picture provider', '201 / picture served', `${img.status} ${imgGet.status} / ${claudeImg.status}`, img.status === 201 && imgGet.status === 200 && claudeImg.status === 201);
  await call('PUT', '/social/ai', A.token, { providers: { anthropic: { api_key: 'sk-ant-WRONG' } } });
  const bad = await call('POST', '/social/ai/test', A.token, { provider: 'anthropic' });
  await call('PUT', '/social/ai', A.token, { providers: { anthropic: { api_key: 'sk-ant-GOOD' } } });
  const okTest = await call('POST', '/social/ai/test', A.token, { provider: 'anthropic' });
  rec('SM-17', 'Owner', '"Test key": a wrong key gets a clear message, the right one works', '400 not accepted / 200', `${bad.status} ${String(bad.data?.message).slice(0, 50)} / ${okTest.status}`, bad.status === 400 && /not accepted/.test(bad.data.message) && okTest.status === 200);

  // 11. Calendar, isolation, storage
  const month = when.slice(0, 7);
  const cal = (await call('GET', `/social/posts?from=${month}-01&to=${month}-31`, A.token)).data.data;
  const farCal = (await call('GET', '/social/posts?from=2099-01-01&to=2099-01-31', A.token)).data.data;
  rec('SM-18', 'Owner', 'Calendar lists the posts of the chosen month only', 'this month > 0, other month 0', `${cal.length} / ${farCal.length}`, cal.length >= 4 && farCal.length === 0);
  await call('PATCH', `/admin/users/${B.id}/features`, SA, { social_media: true });
  const bPosts = (await call('GET', '/social/posts', B.token)).data.data;
  const bAcc = (await call('GET', '/social/accounts', B.token)).data.data;
  const bEdit = await call('PUT', `/social/posts/${sch.data.data.id}`, B.token, { text: 'hack' });
  const bDisc = await call('DELETE', `/social/accounts/${fbAcc.id}`, B.token);
  rec('SM-19', 'Other company', 'Another company sees none of these posts or accounts and cannot change them', '0, 0, 404, 404', `${bPosts.length} ${bAcc.length} ${bEdit.status} ${bDisc.status}`, bPosts.length === 0 && bAcc.length === 0 && bEdit.status === 404 && bDisc.status === 404);
  const usage = require('../utils/usage');
  usage.clearUsageCache();
  const owner = dataStore.users.find((x) => x.id === A.id);
  rec('SM-20', 'Storage', 'Social Media pictures count towards the company\'s storage', '> 0 bytes in marketing media', usage.tenantFootprint(owner).bytes, usage.tenantFootprint(owner).bytes > PNG.length);
  const del = await call('DELETE', `/social/posts/${now.data.data.id}`, A.token);
  rec('SM-21', 'Owner', 'Deleting a published post removes it from the calendar (it stays on Facebook)', '200, stays message', `${del.status} ${del.data?.message}`, del.status === 200 && /stays/.test(del.data.message));

  server.close();
  metaFake.close();
  aiFake.close();
  const failedRows = results.filter((r) => r.result === 'FAIL');
  console.table(results.map((r) => ({ ...r, scenario: r.scenario.slice(0, 70), actual: r.actual.slice(0, 80) })));
  console.log(`SOCIAL MEDIA: ${results.length - failedRows.length} PASSED | ${failedRows.length} FAILED | TOTAL: ${results.length}`);
  process.exit(failedRows.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
