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
    // Results + comments (Part 2): numbers grow with the post number so the report can rank them
    const fbPost = /^\/(5001_(\d+))(\/insights|\/comments)?$/.exec(p);
    const igPost = /^\/(ig(\d+))(\/insights|\/comments)?$/.exec(p);
    if (req.method === 'GET' && fbPost && (fbPost[3] || /reactions/.test(q.get('fields') || ''))) {
      const n = Number(fbPost[2]);
      if (fbPost[3] === '/insights') return send(200, { data: [{ name: 'post_impressions_unique', values: [{ value: 100 * n }] }, { name: 'post_clicks', values: [{ value: n }] }] });
      if (fbPost[3] === '/comments') return send(200, { data: n === 1 ? [{ id: `c_${fbPost[1]}_1`, from: { id: '777', name: 'Ahmed Al-Mansoor' }, message: 'Price please for 20 MT CIF Jebel Ali', created_time: '2030-01-02T10:00:00+0000' }, { id: `c_${fbPost[1]}_2`, from: { id: '5001', name: 'Nova Agro Exports' }, message: 'our own reply', created_time: '2030-01-02T11:00:00+0000' }] : [] });
      return send(200, { reactions: { summary: { total_count: 10 * n } }, comments: { summary: { total_count: n === 1 ? 1 : 0 } }, shares: { count: n } });
    }
    if (req.method === 'GET' && igPost && (igPost[3] || /like_count/.test(q.get('fields') || ''))) {
      const n = Number(igPost[2]);
      if (igPost[3] === '/insights') return send(200, { data: [{ name: 'reach', values: [{ value: 50 * n }] }, { name: 'saved', values: [{ value: n }] }, { name: 'shares', values: [{ value: 0 }] }] });
      if (igPost[3] === '/comments') return send(200, { data: [{ id: `igc_${n}`, username: 'buyer_dubai', text: 'Interested, DM me', timestamp: '2030-01-03T09:00:00+0000' }] });
      return send(200, { like_count: 5 * n, comments_count: 1 });
    }
    if (req.method === 'POST' && /^\/(c_|igc_)[\w]+\/(comments|replies)$/.test(p)) { fb.replies = [...(fb.replies || []), { path: p, message: form.message }]; return send(200, { id: `r${(fb.replies || []).length}` }); }
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
      const userText = JSON.stringify(b.messages);
      const month = (/Month: (\d{4}-\d{2})/.exec(userText) || [])[1] || '2030-03';
      const text = /Say OK/.test(userText) ? 'OK'
        : /Review last month/.test(String(b.system)) ? JSON.stringify({ summary: 'Photo posts did best; text posts were weak.', worked: ['Product photos on Tuesday mornings'], not_worked: ['Text-only posts'], next_month: ['More photo posts', 'Post on Tuesday and Thursday mornings'] })
        : /prepare the brand profile/.test(String(b.system)) ? JSON.stringify({ company: 'Ravi Exports Pvt Ltd', about: 'Indian exporter of turmeric and maize.', products: 'Turmeric finger (curcumin 3%+), Maize', certifications: '', countries: 'UAE, Vietnam', buyers: 'Importers and feed mills', usp: 'Own processing unit', tone: 'professional and friendly', language: 'English', goal: 'Get enquiries from importers', cta: 'WhatsApp us for CIF price', photos: 'Product close-ups, packing, loading' })
        : /Plan one month of posts/.test(String(b.system)) ? JSON.stringify({ summary: 'Show quality and shipments.', pillars: [{ name: 'Product', share: 40, why: 'buyers' }, { name: 'Quality', share: 30, why: 'trust' }, { name: 'Shipments', share: 30, why: 'proof' }], best_times: [{ day: 'Tuesday', time: '10:00', why: 'Gulf mornings' }], items: [
          { date: `${month}-05`, time: '10:00', platforms: ['facebook', 'instagram'], pillar: 'Product', format: 'photo', title: 'New crop turmeric', brief: 'Show the new crop' },
          { date: `${month}-12`, time: '11:30', platforms: ['facebook'], pillar: 'Quality', format: 'text', title: 'Lab report', brief: 'Curcumin test result' },
          { date: `${month}-19`, time: '10:00', platforms: ['facebook'], pillar: 'Shipments', format: 'photo', title: 'Container to Dubai', brief: 'Loading photo' },
          { date: `${month}-26`, time: '25:99', platforms: ['facebook'], pillar: 'Product', format: 'photo', title: 'Maize offer', brief: 'Feed grade maize' },
          { date: '1999-01-01', time: '10:00', platforms: ['facebook'], pillar: 'Product', format: 'photo', title: 'Wrong month', brief: 'x' },
        ] })
        : /plan a month/.test(String(b.system)) ? JSON.stringify({ ideas: [{ date: '2030-03-04', title: 'Harvest update', brief: 'Show the new crop', platforms: ['facebook', 'instagram'] }, { date: '2030-03-11', title: 'Lab report', brief: 'Curcumin test', platforms: ['facebook'] }] }) : POST_JSON;
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

  // 11b. Part 2: results, comments inbox, report, AI review
  const thisMonth = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7);
  const refresh = await call('POST', '/social/results/refresh', A.token);
  const postedNow = dataStore.waRecords.filter((r) => r.kind === 'social_post' && r.owner_id === A.id && r.status === 'posted');
  const withMetrics = postedNow.filter((x) => (x.targets || []).some((t) => t.metrics && t.metrics.fetched_at));
  const cms = (await call('GET', '/social/comments', A.token)).data?.data || [];
  rec('SM-30', 'Server / Meta', 'Results (likes, reach, shares, saves) and new comments come from Facebook and Instagram; the Page\'s own comment is skipped', 'metrics on every post, buyer comments only', `${refresh.status} updated=${refresh.data?.data?.updated} posts=${postedNow.length}/${withMetrics.length} comments=${cms.map((c) => c.author).join(', ')}`, refresh.status === 200 && withMetrics.length === postedNow.length && postedNow.length >= 3 && cms.length >= 2 && !cms.some((c) => c.author === 'Nova Agro Exports') && cms.some((c) => c.author === 'Ahmed Al-Mansoor'));
  const refresh2 = await call('POST', '/social/results/refresh', A.token);
  const cms2 = (await call('GET', '/social/comments', A.token)).data?.data || [];
  rec('SM-31', 'Server', 'Refreshing again does not copy the same comments twice', `${cms.length} comments`, `${refresh2.data?.data?.new_comments} new, ${cms2.length} total`, refresh2.data.data.new_comments === 0 && cms2.length === cms.length);
  const ahmed = cms.find((c) => c.author === 'Ahmed Al-Mansoor');
  const reply = await call('POST', `/social/comments/${ahmed.id}/reply`, ST, { text: 'Thank you Ahmed, we sent our CIF price on WhatsApp.' });
  rec('SM-32', 'Staff', 'Reply to a comment from the CRM: it is posted under the comment and marked done', '200, posted, done', `${reply.status} ${(fb.replies || []).slice(-1)[0]?.message?.slice(0, 20)} ${reply.data?.data?.status}`, reply.status === 200 && /Thank you Ahmed/.test((fb.replies || []).slice(-1)[0]?.message || '') && reply.data.data.status === 'done');
  const mkLead = await call('POST', `/social/comments/${ahmed.id}/lead`, ST, { company_name: 'Al Noor Trading LLC', country: 'United Arab Emirates', phone: '+971 50 111 2222' });
  const mkLead2 = await call('POST', `/social/comments/${ahmed.id}/lead`, ST, {});
  const newLead = dataStore.leads.find((l) => l.id === mkLead.data?.data?.lead_id) || {};
  rec('SM-33', 'Staff / Lead', 'A buyer\'s comment becomes a lead (source Facebook, linked to the post, follow-up today); only once', '201 / 409, source Facebook', `${mkLead.status} / ${mkLead2.status} ${newLead.source} post=${Boolean(newLead.social_post_id)} assigned=${newLead.assigned_to === st.id} remark="${(newLead.today_remarks || '').slice(0, 40)}"`, mkLead.status === 201 && mkLead2.status === 409 && newLead.source === 'Facebook' && newLead.social_post_id === ahmed.post_id && newLead.assigned_to === st.id && /Price please/.test(newLead.today_remarks));
  const rep = (await call('GET', `/social/report?month=${thisMonth}&tz_offset=-330`, A.token)).data?.data || {};
  rec('SM-34', 'Owner', 'Monthly report: totals, best-first by pillar / day / time / format / platform, top posts, and leads per post', 'posts, reach > 0, 1 lead, sorted top', `posts=${rep.posts} reach=${rep.totals?.reach} eng=${rep.totals?.engagement} leads=${rep.totals?.leads} top=${(rep.top || []).map((x) => x.engagement).join('>')} platforms=${(rep.by_platform || []).map((x) => x.name).join('/')}`, rep.posts >= 3 && rep.totals.reach > 0 && rep.totals.leads === 1 && rep.top[0].engagement >= rep.top[rep.top.length - 1].engagement && rep.by_platform.length === 2 && rep.by_day.length >= 1 && rep.by_time.length >= 1 && rep.by_time[0].name !== 'undefined');
  const review = await call('POST', '/social/report/review', A.token, { month: thisMonth, tz_offset: -330 });
  const staffReview = await call('POST', '/social/report/review', ST, { month: thisMonth });
  const repAgain = (await call('GET', `/social/report?month=${thisMonth}`, A.token)).data?.data || {};
  rec('SM-35', 'Owner / AI', 'AI reviews the month (what worked, what did not, what to change); the review is kept with the report; staff cannot run it', '200 + points / 403 / saved', `${review.status} worked=${(review.data?.data?.points?.worked || []).length} next=${(review.data?.data?.points?.next_month || []).length} / ${staffReview.status} / ${Boolean(repAgain.review)}`, review.status === 200 && review.data.data.points.next_month.length >= 1 && staffReview.status === 403 && Boolean(repAgain.review));

  // 12. AI Social Media Manager (Part 1): Brand Profile -> month plan -> posts -> scheduled
  const nm = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString().slice(0, 7);
  const planNoBrand = await call('POST', '/social/plan', A.token, { month: nm });
  const brandBad = await call('PUT', '/social/brand', A.token, { company: 'Ravi Exports' });
  const draft = await call('POST', '/social/brand/draft', A.token, { description: 'We export turmeric and maize from Kerala to the Gulf and Vietnam.' });
  const lastSys = String((aiLog.filter((x) => x.path === '/v1/messages').pop() || {}).body?.system || '') + JSON.stringify((aiLog.filter((x) => x.path === '/v1/messages').pop() || {}).body?.messages || '');
  const brandSave = await call('PUT', '/social/brand', A.token, draft.data?.data || {});
  const staffBrand = await call('PUT', '/social/brand', ST, draft.data?.data || {});
  rec('SM-22', 'Owner / AI', 'Plan needs a Brand Profile first; the AI drafts the profile from the CRM\'s own products and the owner\'s words; staff cannot change it', '400 / 400 / draft / saved / 403', `${planNoBrand.status} / ${brandBad.status} / ${draft.data?.data?.products} / ${brandSave.status} / ${staffBrand.status}`, planNoBrand.status === 400 && brandBad.status === 400 && /Turmeric/.test(draft.data?.data?.products || '') && /Kerala/.test(lastSys) && brandSave.status === 200 && staffBrand.status === 403);
  const plan = await call('POST', '/social/plan', A.token, { month: nm, posts_per_week: 2, focus: 'new crop turmeric' });
  const pd = plan.data?.data || {};
  rec('SM-23', 'Owner / AI', 'The AI makes the month plan: pillars (add to 100%), best times and dated posts; wrong dates and times are cleaned', '4 items, pillars 100, bad time -> 10:00', `${plan.status} items=${(pd.items || []).length} pillars=${(pd.pillars || []).map((p) => `${p.name}:${p.share}`).join(',')} times=${(pd.items || []).map((i) => i.time).join(',')}`, plan.status === 201 && pd.items.length === 4 && pd.pillars.reduce((s, p) => s + p.share, 0) === 100 && pd.items.every((i) => i.date.startsWith(nm)) && pd.items[3].time === '10:00' && pd.best_times.length === 1);
  const planPrompt = JSON.stringify((aiLog.filter((x) => x.path === '/v1/messages' && /Plan one month of posts/.test(String(x.body?.system))).pop() || {}).body?.messages || '');
  rec('SM-36', 'AI / Results', 'Next month\'s plan learns from this month: results and the review advice go into the plan request', 'learned_from_results, prompt has results + advice', `learned=${pd.learned_from_results} results=${/What our earlier results say/.test(planPrompt)} advice=${/More photo posts/.test(planPrompt)}`, pd.learned_from_results === true && /What our earlier results say/.test(planPrompt) && /Pillars best to worst/.test(planPrompt) && /More photo posts/.test(planPrompt));
  const edited = await call('PUT', `/social/plan/${pd.id}`, A.token, { items: pd.items.slice(0, 3).map((it, i) => (i === 0 ? { ...it, title: 'New crop turmeric – edited' } : it)) });
  rec('SM-24', 'Owner', 'The owner edits a plan item and removes one before writing', '3 items, edited title', `${edited.status} ${(edited.data?.data?.items || []).length} ${edited.data?.data?.items?.[0]?.title}`, edited.status === 200 && edited.data.data.items.length === 3 && edited.data.data.items[0].title === 'New crop turmeric – edited');
  const aiBefore = aiLog.length;
  const writeRun = await call('POST', `/social/plan/${pd.id}/write`, A.token, { tz_offset: -330 });
  let job = null;
  for (let i = 0; i < 50; i++) { await wait(100); job = (await call('GET', `/social/plan?month=${nm}`, A.token)).data?.data; if (job?.job && !job.job.running) break; }
  const planPosts = dataStore.waRecords.filter((r) => r.kind === 'social_post' && r.plan_id === pd.id);
  const sysUsed = aiLog.slice(aiBefore).map((x) => String(x.body?.system || '')).join(' ');
  const first = planPosts.find((x) => x.plan_item_id === pd.items[0].id) || {};
  rec('SM-25', 'Owner / AI', 'Every post of the plan is written as a draft with the Brand Profile, at the planned date and time', '202, 3 drafts, 10:00 IST = 04:30Z', `${writeRun.status} done=${job?.job?.done}/${job?.job?.total} drafts=${planPosts.filter((x) => x.status === 'draft').length} at=${first.scheduled_at} brand=${/Own processing unit/.test(sysUsed)}`, writeRun.status === 202 && job.job.done === 3 && planPosts.length === 3 && planPosts.every((x) => x.status === 'draft') && first.scheduled_at === `${nm}-05T04:30:00.000Z` && /Own processing unit/.test(sysUsed) && job.items.every((it) => it.post_id));
  const again = await call('POST', `/social/plan/${pd.id}/write`, A.token, {});
  const staffWrite = await call('POST', `/social/plan/${pd.id}/write`, ST, {});
  const staffView = await call('GET', `/social/plan?month=${nm}`, ST);
  rec('SM-26', 'Owner / Staff', 'Writing twice is refused; staff can view the plan but not run it', '400 / 403 / 200', `${again.status} / ${staffWrite.status} / ${staffView.status}`, again.status === 400 && staffWrite.status === 403 && staffView.status === 200);
  const sched = await call('POST', `/social/plan/${pd.id}/schedule`, A.token, {});
  const sd = sched.data?.data || {};
  rec('SM-27', 'Owner', 'Schedule all: Facebook-only posts are scheduled; the Instagram one without a picture is listed as "needs a picture"', '2 scheduled, 1 not ready', `${sched.status} scheduled=${sd.scheduled} not_ready=${(sd.not_ready || []).map((x) => x.problem).join(' | ')}`, sched.status === 200 && sd.scheduled === 2 && sd.not_ready.length === 1 && /picture/.test(sd.not_ready[0].problem) && sd.status === 'approved');
  // The Instagram draft without a picture: AI makes it (company's OpenAI key), then "Schedule all" again
  const pics = await call('POST', `/social/plan/${pd.id}/pictures`, A.token, {});
  let pj = null;
  for (let i = 0; i < 50; i++) { await wait(100); pj = (await call('GET', `/social/plan?month=${nm}`, A.token)).data?.data; if (pj?.job && pj.job.kind === 'pictures' && !pj.job.running) break; }
  const igDraft = dataStore.waRecords.find((r) => r.kind === 'social_post' && r.plan_id === pd.id && r.status === 'draft');
  const sched2 = await call('POST', `/social/plan/${pd.id}/schedule`, A.token, {});
  const fbOnlyNone = await call('POST', `/social/plan/${pd.id}/facebook-only`, A.token, {});
  rec('SM-29', 'Owner / AI', 'AI makes the missing Instagram picture; "Schedule all" again schedules it; nothing is left for "Facebook only"', '202, 1 picture, 1 scheduled, 0 changed', `${pics.status} made=${pj?.job?.done} media=${(igDraft?.media_ids || []).length} sched=${sched2.data?.data?.scheduled} fbOnly=${fbOnlyNone.data?.data?.changed}`, pics.status === 202 && pj.job.done === 1 && (igDraft?.media_ids || []).length === 1 && sched2.data.data.scheduled === 1 && fbOnlyNone.data.data.changed === 0);
  const delPlan = await call('DELETE', `/social/plan/${pd.id}`, A.token);
  const left = dataStore.waRecords.filter((r) => r.kind === 'social_post' && r.plan_id === pd.id);
  rec('SM-28', 'Owner', 'Deleting the plan keeps the scheduled posts (nothing unpublished is left)', '200, 3 left (scheduled)', `${delPlan.status} left=${left.length} ${left.map((x) => x.status).join(',')}`, delPlan.status === 200 && left.length === 3 && left.every((x) => x.status === 'scheduled'));

  server.close();
  metaFake.close();
  aiFake.close();
  const failedRows = results.filter((r) => r.result === 'FAIL');
  console.table(results.map((r) => ({ ...r, scenario: r.scenario.slice(0, 70), actual: r.actual.slice(0, 80) })));
  console.log(`SOCIAL MEDIA: ${results.length - failedRows.length} PASSED | ${failedRows.length} FAILED | TOTAL: ${results.length}`);
  process.exit(failedRows.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
