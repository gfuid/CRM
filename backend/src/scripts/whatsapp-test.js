/**
 * Tests: WhatsApp marketing against a FAKE WhatsApp Cloud API (no real messages are sent).
 *   node src/scripts/whatsapp-test.js
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdm1n!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'whatsapp_test_secret';
process.env.WA_SEND_DELAY_MS = '5';

const http = require('http');
const crypto = require('crypto');

// ---------- fake Meta Graph API ----------
const meta = { sent: [], templates: [], uploads: 0, deleted: [] };
const fake = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.headers.authorization !== 'Bearer GOOD_TOKEN' && req.headers.authorization !== 'OAuth GOOD_TOKEN') return send(401, { error: { message: 'Invalid OAuth access token.', code: 190 } });
    if (req.method === 'GET' && url.pathname === '/111') return send(200, { display_phone_number: '+91 98765 43210', verified_name: 'Nova Agro', quality_rating: 'GREEN', messaging_limit_tier: 'TIER_250', id: '111' });
    if (req.method === 'GET' && url.pathname === '/222/message_templates') return send(200, { data: meta.templates });
    if (req.method === 'POST' && url.pathname === '/222/message_templates') {
      const t = JSON.parse(body);
      const rec = { id: `tpl${meta.templates.length + 1}`, status: 'PENDING', ...t };
      meta.templates.push(rec);
      return send(200, { id: rec.id, status: 'PENDING', category: t.category });
    }
    if (req.method === 'DELETE' && url.pathname === '/222/message_templates') { meta.deleted.push(url.searchParams.get('name')); return send(200, { success: true }); }
    if (req.method === 'POST' && url.pathname === '/333/uploads') return send(200, { id: 'upload:abc' });
    if (req.method === 'POST' && url.pathname === '/upload:abc') { meta.uploads += 1; return send(200, { h: 'HANDLE123' }); }
    if (req.method === 'POST' && url.pathname === '/111/messages') {
      const m = JSON.parse(body);
      if (m.status === 'read') return send(200, { success: true });
      if (m.to === '911111111111') return send(400, { error: { message: 'Recipient phone number not in allowed list', code: 131030 } });
      meta.sent.push(m);
      return send(200, { messaging_product: 'whatsapp', messages: [{ id: `wamid.${meta.sent.length}` }] });
    }
    return send(404, { error: { message: `fake: no route ${req.method} ${url.pathname}` } });
  });
});

let BASE = '';
const results = [];
const rec = (id, who, scenario, expected, actual, pass) => results.push({ id, who, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const u = Date.now();

(async () => {
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  process.env.WA_GRAPH_BASE = `http://127.0.0.1:${fake.address().port}`;
  const app = require('../app');
  const { dataStore } = require('../repositories/dataStore');
  const wa = require('../controllers/whatsapp.controller');
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`;
  BASE = `${ORIGIN}/api/v1`;
  const call = async (method, path, token, body, headers = {}) => {
    const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };

  const reg = async (name) => {
    const r = await call('POST', '/auth/register', null, { name, email: `${name.toLowerCase()}${u}@t.com`, password: 'Owner123', company_name: `${name} Co` });
    return { token: r.data.data.token, id: r.data.data.user.id };
  };
  const A = await reg('Ravi');
  const B = await reg('Bina');
  await call('POST', '/admin/users', A.token, { name: 'Staffer', email: `wst${u}@t.com`, password: 'Staff123' });
  const ST = (await call('POST', '/auth/login', null, { email: `wst${u}@t.com`, password: 'Staff123' })).data.data.token;

  // 1. Locked until the admin switches it on
  const locked = await call('GET', '/whatsapp/settings', A.token);
  const SA = (await call('POST', '/auth/admin-login', null, { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD })).data.data.token;
  const on = await call('PATCH', `/admin/users/${A.id}/features`, SA, { whatsapp_marketing: true });
  const staffTry = await call('GET', '/whatsapp/settings', ST);
  rec('WA-01', 'Owner / Admin / Staff', 'Locked until the admin switches it on; staff never get in', '403, 200, 403', `${locked.status} ${on.status} ${staffTry.status}`, locked.status === 403 && locked.data.code === 'FEATURE_DISABLED' && on.status === 200 && staffTry.status === 403);

  // 2. Connect the number
  const bad = await call('PUT', '/whatsapp/settings', A.token, { phone_number_id: '111', waba_id: '222', access_token: 'WRONG' });
  const good = await call('PUT', '/whatsapp/settings', A.token, { phone_number_id: '111', waba_id: '222', access_token: 'GOOD_TOKEN', app_id: '333', app_secret: 'APPSECRET' });
  const s = good.data?.data || {};
  rec('WA-02', 'Owner', 'A wrong token is refused with WhatsApp\'s reason; the right one connects and reads the number', '400 / connected +91…', `${bad.status} ${bad.data?.message?.slice(0, 40)} / ${good.status} ${s.display_phone} ${s.tier}`, bad.status === 400 && /Invalid OAuth/.test(bad.data.message) && good.status === 200 && s.display_phone === '+91 98765 43210' && s.tier === 'TIER_250');
  const again = (await call('GET', '/whatsapp/settings', A.token)).data.data;
  rec('WA-03', 'Owner', 'The token and app secret are never sent back; webhook link and verify token are shown', 'no token, webhook url', `${JSON.stringify(again).includes('GOOD_TOKEN') || JSON.stringify(again).includes('APPSECRET') ? 'LEAKED' : 'hidden'} ${again.webhook_url.includes('/api/v1/whatsapp/webhook/')}`, !JSON.stringify(again).includes('GOOD_TOKEN') && !JSON.stringify(again).includes('APPSECRET') && again.has_token && again.webhook_url.includes('/whatsapp/webhook/') && again.verify_token.length >= 16);
  const stored = dataStore.waRecords.find((r) => r.kind === 'settings' && r.owner_id === A.id);
  const hookPath = `/whatsapp/webhook/${stored.webhook_key}`;

  // 3. Webhook verification (what Meta does when you paste the link)
  const v1 = await fetch(`${BASE}${hookPath}?hub.mode=subscribe&hub.verify_token=${again.verify_token}&hub.challenge=12345`);
  const v2 = await fetch(`${BASE}${hookPath}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`);
  rec('WA-04', 'Meta', 'Webhook check: right verify token gets the challenge back, a wrong one is refused', '200 12345 / 403', `${v1.status} ${await v1.text()} / ${v2.status}`, v1.status === 200 && v2.status === 403);

  // 4. Picture + template
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(500, 1)]);
  const up = await call('POST', '/whatsapp/media', A.token, { data_url: `data:image/png;base64,${png.toString('base64')}` });
  const fakePic = await call('POST', '/whatsapp/media', A.token, { data_url: `data:image/png;base64,${Buffer.from('<html>').toString('base64')}` });
  const pub = await fetch(`${ORIGIN}/api/v1/whatsapp/media/${up.data?.data?.id}`);
  rec('WA-05', 'Owner / WhatsApp', 'Upload a picture; a fake picture is refused; WhatsApp can load it without login', '201, 400, 200 image/png', `${up.status} ${fakePic.status} ${pub.status} ${pub.headers.get('content-type')}`, up.status === 201 && fakePic.status === 400 && pub.status === 200 && pub.headers.get('content-type') === 'image/png');
  const tpl = await call('POST', '/whatsapp/templates', A.token, {
    name: 'Turmeric Offer', category: 'MARKETING', language: 'en', header_type: 'image', header_media_id: up.data.data.id,
    body: 'Hello {{1}}, fresh {{2}} is ready. Reply YES for the price list.', body_examples: ['Ahmed', 'turmeric'], footer: 'Nova Agro Exports',
    buttons: [{ type: 'QUICK_REPLY', text: 'Send price' }, { type: 'URL', text: 'Catalogue', url: 'https://example.com/catalogue' }],
  });
  const sentToMeta = meta.templates[0] || {};
  const header = (sentToMeta.components || []).find((c) => c.type === 'HEADER') || {};
  rec('WA-06', 'Owner', 'Template with picture, 2 variables and buttons goes to WhatsApp for approval', '201 PENDING, name turmeric_offer, handle', `${tpl.status} ${tpl.data?.data?.status} ${sentToMeta.name} ${header.example?.header_handle?.[0]} vars=${tpl.data?.data?.variables}`, tpl.status === 201 && tpl.data.data.status === 'PENDING' && sentToMeta.name === 'turmeric_offer' && header.example.header_handle[0] === 'HANDLE123' && tpl.data.data.variables === 2 && meta.uploads === 1);
  const badName = await call('POST', '/whatsapp/templates', A.token, { name: 'Bad Name!', body: 'x' });
  rec('WA-07', 'Owner', 'A template name with symbols is refused before reaching WhatsApp', '400', badName.status, badName.status === 400);

  // Not approved yet -> cannot send
  const leadA = await call('POST', '/leads', A.token, { company_name: `Al Noor ${u}`, name: `Al Noor ${u}`, country: 'UAE', contact_person: 'Ahmed', whatsapp: '+971 50 111 2222', tags: ['dubai'], product: 'Turmeric', stage: 'Lead Generation', follow_up_date: '2030-01-01', follow_up_time: '10:00', today_remarks: 'x', next_follow_up_action: 'y' });
  await call('POST', '/leads', A.token, { company_name: `Kosmo ${u}`, name: `Kosmo ${u}`, country: 'Sri Lanka', contact_person: 'Nilakshi', whatsapp: '+94 77 384 6879', tags: ['dubai'], product: 'Maize', stage: 'Lead Generation', follow_up_date: '2030-01-01', follow_up_time: '10:00', today_remarks: 'x', next_follow_up_action: 'y' });
  await call('POST', '/leads', A.token, { company_name: `NoPhone ${u}`, name: `NoPhone ${u}`, country: 'India', tags: ['dubai'], stage: 'Lead Generation', follow_up_date: '2030-01-01', follow_up_time: '10:00', today_remarks: 'x', next_follow_up_action: 'y' });
  const prev = await call('GET', '/whatsapp/audience/preview?mode=tags&tags=dubai', A.token);
  rec('WA-08', 'Owner', 'Audience by tag counts only leads with a WhatsApp number; cost is estimated', '2 numbers, 1 skipped, cost > 0', `${prev.data?.data?.count} ${prev.data?.data?.skipped} ${prev.data?.data?.est_cost}`, prev.data.data.count === 2 && prev.data.data.skipped === 1 && prev.data.data.est_cost > 0);
  const tid = tpl.data.data.id;
  const early = await call('POST', '/whatsapp/campaigns', A.token, { name: 'Early', template_id: tid, audience: { mode: 'tags', tags: ['dubai'] }, send_now: true, variables: [{ source: 'field', field: 'contact_name' }, { source: 'text', text: 'turmeric' }] });
  rec('WA-09', 'Owner', 'A template still waiting for approval cannot be sent', '400 not approved', `${early.status} ${early.data?.message?.slice(0, 50)}`, early.status === 400 && /not approved/.test(early.data.message));

  // Approval arrives (sync from WhatsApp)
  meta.templates[0].status = 'APPROVED';
  const sync = await call('POST', '/whatsapp/templates/sync', A.token);
  const synced = (sync.data?.data || []).find((t) => t.name === 'turmeric_offer') || {};
  rec('WA-10', 'Owner', '"Sync" brings Meta\'s approval into the CRM', 'APPROVED', synced.status, synced.status === 'APPROVED' && synced.header_media_id === up.data.data.id);

  // 5. Broadcast
  const camp = await call('POST', '/whatsapp/campaigns', A.token, { name: 'Dubai turmeric', template_id: tid, audience: { mode: 'custom', numbers: '+971 50 111 2222, +94 77 384 6879, 911111111111, 12' }, send_now: true, variables: [{ source: 'field', field: 'contact_name', fallback: 'Sir' }, { source: 'text', text: 'turmeric' }] });
  for (let i = 0; i < 40 && dataStore.waRecords.some((r) => r.kind === 'campaign' && r.status === 'sending'); i++) await wait(50);
  const c1 = (await call('GET', `/whatsapp/campaigns/${camp.data.data.id}`, A.token)).data.data;
  const first = meta.sent.find((m) => m.to === '971501112222') || {};
  const bodyParams = ((first.template?.components || []).find((c) => c.type === 'body') || {}).parameters || [];
  const headerParam = ((first.template?.components || []).find((c) => c.type === 'header') || {}).parameters?.[0];
  rec('WA-11', 'Owner', 'Broadcast: 2 sent, 1 refused by WhatsApp (reason kept), bad number skipped', 'sent 2, failed 1, total 3', `${c1.stats.sent} ${c1.stats.failed} ${c1.stats.total} ${c1.recipients.find((r) => r.status === 'failed')?.error?.slice(0, 30)}`, c1.stats.sent === 2 && c1.stats.failed === 1 && c1.stats.total === 3 && /allowed list/.test(c1.recipients.find((r) => r.status === 'failed').error));
  rec('WA-12', 'WhatsApp', 'Template message carries the picture link and the variables (fallback when no name)', 'image link + Sir/turmeric', `${headerParam?.image?.link?.includes('/whatsapp/media/')} ${bodyParams.map((p) => p.text).join('/')}`, headerParam && headerParam.image.link.includes('/api/v1/whatsapp/media/') && bodyParams.length === 2 && bodyParams[1].text === 'turmeric');

  // 6. Delivery / read / reply from Meta's webhook (signed)
  const sign = (obj) => `sha256=${crypto.createHmac('sha256', 'APPSECRET').update(JSON.stringify(obj)).digest('hex')}`;
  const hook = async (value, sig) => {
    const payload = { object: 'whatsapp_business_account', entry: [{ id: '222', changes: [{ field: 'messages', value }] }] };
    const r = await fetch(`${BASE}${hookPath}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sig === undefined ? sign(payload) : sig }, body: JSON.stringify(payload) });
    await wait(80);
    return r.status;
  };
  const w1 = c1.recipients.find((r) => r.to === '971501112222').wamid;
  const forged = await hook({ statuses: [{ id: w1, status: 'read' }] }, 'sha256=forged');
  await hook({ statuses: [{ id: w1, status: 'delivered', pricing: { category: 'marketing' } }] });
  await hook({ statuses: [{ id: w1, status: 'read' }] });
  await hook({ statuses: [{ id: w1, status: 'delivered' }] }); // late "delivered" must not undo "read"
  const c2 = (await call('GET', `/whatsapp/campaigns/${camp.data.data.id}`, A.token)).data.data;
  rec('WA-13', 'Meta', 'Unsigned update refused; delivered then read counted; a late "delivered" does not go back', '401, read 1', `${forged} read=${c2.stats.read} delivered=${c2.stats.delivered}`, forged === 401 && c2.stats.read === 1 && c2.stats.delivered === 1);

  // Buyer replies -> chat + broadcast reply count
  await call('POST', '/whatsapp/rules', A.token, { name: 'Welcome', trigger: 'welcome', reply: 'Thanks for writing to Nova Agro! We reply within 1 hour.' });
  await call('POST', '/whatsapp/rules', A.token, { name: 'Price', trigger: 'keyword', keywords: 'price, rate', reply: 'Our price list: https://example.com/prices' });
  const before = meta.sent.length;
  await hook({ contacts: [{ wa_id: '971501112222', profile: { name: 'Ahmed' } }], messages: [{ from: '971501112222', id: 'wamid.in1', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Hello' } }] });
  const welcome = meta.sent.slice(before).map((m) => m.text?.body).join(' | ');
  await hook({ messages: [{ from: '971501112222', id: 'wamid.in2', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'What is the PRICE today?' } }] });
  const keyword = meta.sent.slice(before).map((m) => m.text?.body).join(' | ');
  await hook({ messages: [{ from: '971501112222', id: 'wamid.in2', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'What is the PRICE today?' } }] }); // Meta may resend
  rec('WA-14', 'Buyer', 'First message gets the welcome, "price" gets the keyword reply, a repeated update is ignored', 'welcome + price list, 2 auto replies', `${welcome.slice(0, 30)} | ${meta.sent.slice(before).length}`, /Thanks for writing/.test(welcome) && /price list/.test(keyword) && meta.sent.slice(before).length === 2);
  const chats = (await call('GET', '/whatsapp/chats', A.token)).data.data;
  const ch = chats.find((c) => c.wa_id === '971501112222') || {};
  const c3 = (await call('GET', `/whatsapp/campaigns/${camp.data.data.id}`, A.token)).data.data;
  rec('WA-15', 'Owner', 'Chat list shows the buyer, linked to the lead, 2 unread, 24h window open; broadcast counts the reply', 'Al Noor, 2 unread, open, replied 1', `${ch.name} ${ch.unread} ${ch.window_open} replied=${c3.stats.replied}`, ch.lead_id === leadA.data.data.id && ch.unread === 2 && ch.window_open && c3.stats.replied === 1);
  const thread = (await call('GET', '/whatsapp/chats/971501112222', A.token)).data.data;
  rec('WA-16', 'Owner', 'Opening the chat shows the whole thread (template, replies, auto replies) and clears unread', '6 messages, unread 0', `${thread.messages.length} ${thread.contact.unread}`, thread.messages.length === 5 && thread.contact.unread === 0 && thread.messages.some((m) => m.direction === 'in'));
  const reply = await call('POST', '/whatsapp/chats/971501112222', A.token, { text: 'Sure Ahmed, sending now.' });
  const closed = await call('POST', '/whatsapp/chats/94773846879', A.token, { text: 'Hi' });
  rec('WA-17', 'Owner', 'Free reply inside 24h works; to someone who never wrote back only a template is allowed', '200 / 400', `${reply.status} / ${closed.status} ${closed.data?.message?.slice(0, 40)}`, reply.status === 200 && closed.status === 400 && /template/.test(closed.data.message));
  const tplReply = await call('POST', '/whatsapp/chats/94773846879', A.token, { template_id: tid, variables: [{ source: 'text', text: 'Nilakshi' }, { source: 'text', text: 'maize' }] });
  rec('WA-18', 'Owner', 'Outside 24h, sending an approved template from the chat works', '200', tplReply.status, tplReply.status === 200);

  // STOP = opted out, left out of the next broadcast
  await hook({ messages: [{ from: '94773846879', id: 'wamid.in3', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'STOP' } }] });
  const prev2 = (await call('GET', '/whatsapp/audience/preview?mode=tags&tags=dubai', A.token)).data.data;
  rec('WA-19', 'Buyer / Owner', 'A buyer who writes STOP is opted out and left out of the next broadcast', '1 number left', `${prev2.count} skipped=${prev2.skipped}`, prev2.count === 1 && prev2.skipped === 2);

  // 7. Dashboard + isolation
  const dash = (await call('GET', '/whatsapp/dashboard', A.token)).data.data;
  rec('WA-20', 'Owner', 'Dashboard: sent, read, failed, replies, cost, opted out, daily limit', 'sent>=4, read 1, failed 1, replies 3, opted 1', `sent=${dash.totals.sent} read=${dash.totals.read} failed=${dash.totals.failed} replies=${dash.totals.replies} cost=${dash.totals.cost} opted=${dash.contacts.opted_out} left=${dash.limit.left}`, dash.totals.sent >= 4 && dash.totals.read === 1 && dash.totals.failed === 1 && dash.totals.replies === 3 && dash.contacts.opted_out === 1 && dash.limit.per_day === 250);
  await call('PATCH', `/admin/users/${B.id}/features`, SA, { whatsapp_marketing: true });
  const bChats = (await call('GET', '/whatsapp/chats', B.token)).data.data;
  const bCamp = await call('GET', `/whatsapp/campaigns/${camp.data.data.id}`, B.token);
  const bTpl = await call('DELETE', `/whatsapp/templates/${tid}`, B.token);
  rec('WA-21', 'Other company', 'Another company sees none of these chats, broadcasts or templates', '0 chats, 404, 404', `${bChats.length} ${bCamp.status} ${bTpl.status}`, bChats.length === 0 && bCamp.status === 404 && bTpl.status === 404);
  const ruleBad = await call('POST', '/whatsapp/rules', A.token, { trigger: 'keyword', keywords: '', reply: 'x' });
  const del = await call('DELETE', `/whatsapp/templates/${tid}`, A.token);
  rec('WA-22', 'Owner', 'A keyword rule without keywords is refused; deleting a template removes it from WhatsApp too', '400 / 200 deleted', `${ruleBad.status} / ${del.status} ${meta.deleted.join(',')}`, ruleBad.status === 400 && del.status === 200 && meta.deleted.includes('turmeric_offer'));
  rec('WA-23', 'Server', 'Cost estimate uses the country rate (India row) or the default', 'India 0.0107, UAE 0.05', `${wa.costFor({ default: { marketing: 0.05, utility: 0.01 }, countries: [{ prefix: '91', marketing: 0.0107, utility: 0.0014 }] }, '919876543210')} ${wa.costFor({ default: { marketing: 0.05 }, countries: [] }, '971501112222')}`, wa.costFor({ default: { marketing: 0.05, utility: 0.01 }, countries: [{ prefix: '91', marketing: 0.0107, utility: 0.0014 }] }, '919876543210') === 0.0107);

  server.close();
  fake.close();
  const fails = results.filter((x) => x.result === 'FAIL');
  console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 70), actual: x.actual.slice(0, 50) })));
  console.log(`WHATSAPP MARKETING: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
