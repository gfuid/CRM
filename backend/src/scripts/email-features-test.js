/**
 * Tests: email marketing — easy sender setup (app password), templates with images, campaign scheduling.
 *   node src/scripts/email-features-test.js
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdm1n!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'email_features_test_secret';

const http = require('http');
const app = require('../app');
const { dataStore } = require('../repositories/dataStore');
const mailer = require('../services/mailer.service');
const email = require('../controllers/email.controller');
const { tenantFootprint, clearUsageCache } = require('../utils/usage');

// No real SMTP in tests: capture what would be sent
const outbox = [];
mailer.createOwnerTransport = (settings) => (settings && settings.pass_enc ? { sendMail: async (m) => { outbox.push(m); return { messageId: String(outbox.length) }; } } : null);

let ORIGIN = '';
let BASE = '';
const results = [];
const call = async (method, path, token, body) => {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
};
const rec = (id, who, scenario, expected, actual, pass) => results.push({ id, who, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const u = Date.now();
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]);
const jpg = `data:image/jpeg;base64,${JPG.toString('base64')}`;
const inFuture = (min) => new Date(Date.now() + min * 60000).toISOString();

(async () => {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  ORIGIN = `http://127.0.0.1:${server.address().port}`;
  BASE = `${ORIGIN}/api/v1`;

  const reg = async (name) => {
    const r = await call('POST', '/auth/register', null, { name, email: `${name.toLowerCase()}${u}@t.com`, password: 'Owner123', company_name: `${name} Co` });
    const user = dataStore.users.find((x) => x.id === r.data.data.user.id);
    user.features = { ...(user.features || {}), email_marketing: true };
    return { token: r.data.data.token, id: user.id, user };
  };
  const A = await reg('Asha');
  const B = await reg('Bilal');
  const staff = await call('POST', '/admin/users', A.token, { name: 'Staffer', email: `stf${u}@t.com`, password: 'Staff123' });
  const ST = (await call('POST', '/auth/login', null, { email: `stf${u}@t.com`, password: 'Staff123' })).data.data.token;

  // 1. Easy sender setup
  const save = await call('PUT', '/email/settings', A.token, { provider: 'gmail', host: 'smtp.gmail.com', port: 587, user: `asha${u}@gmail.com`, pass: 'abcd efgh ijkl mnop', from_name: 'Asha' });
  const stored = dataStore.emailSettings.find((s) => s.owner_id === A.id);
  rec('EM-01', 'Owner', 'Gmail app password pasted with spaces is saved without spaces, encrypted', 'abcdefghijklmnop, enc:', `${save.status} ${mailer.decryptSecret(stored.pass_enc)} ${String(stored.pass_enc).slice(0, 4)}`, save.status === 200 && mailer.decryptSecret(stored.pass_enc) === 'abcdefghijklmnop' && stored.pass_enc.startsWith('enc:') && stored.provider === 'gmail');
  const masked = await call('GET', '/email/settings', A.token);
  rec('EM-02', 'Owner', 'Settings never return the password', 'has_password true, no pass', JSON.stringify(Object.keys(masked.data.data)).includes('pass_enc') ? 'leaked' : masked.data.data.has_password, masked.data.data.has_password === true && !('pass_enc' in masked.data.data) && !('pass' in masked.data.data));
  const test = await call('POST', '/email/settings/test', A.token, {});
  rec('EM-03', 'Owner', 'One-click test email after saving', '200 + mail sent', `${test.status} outbox=${outbox.length}`, test.status === 200 && outbox.length === 1);

  // 2. Images
  const up = await call('POST', '/email/images', A.token, { data_url: jpg, name: 'banner.jpg' });
  const imgUrl = up.data?.data?.url || '';
  rec('EM-04', 'Owner', 'Upload a picture for an email', '201 + public absolute url', `${up.status} ${imgUrl.slice(-40)}`, up.status === 201 && /^https?:\/\/.+\/api\/v1\/email\/images\/ei_[a-f0-9]{24}$/.test(imgUrl));
  const pub = await fetch(`${ORIGIN}/api/v1/email/images/${up.data.data.id}`);
  rec('EM-05', 'Email app', 'Picture loads without login (Gmail/Outlook), cached', '200 image/jpeg immutable', `${pub.status} ${pub.headers.get('content-type')}`, pub.status === 200 && pub.headers.get('content-type') === 'image/jpeg' && /immutable/.test(pub.headers.get('cache-control') || ''));
  const fake = await call('POST', '/email/images', A.token, { data_url: `data:image/jpeg;base64,${Buffer.from('<html>').toString('base64')}` });
  const svg = await call('POST', '/email/images', A.token, { data_url: `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}` });
  const big = await call('POST', '/email/images', A.token, { data_url: `data:image/jpeg;base64,${Buffer.concat([JPG, Buffer.alloc(205 * 1024)]).toString('base64')}` });
  const stImg = await call('POST', '/email/images', ST, { data_url: jpg });
  rec('EM-06', 'Owner / Staff', 'Fake image, SVG, >200 KB, staff upload', '400 / 400 / 413 / 403', `${fake.status} / ${svg.status} / ${big.status} / ${stImg.status}`, fake.status === 400 && svg.status === 400 && [413].includes(big.status) && stImg.status === 403);

  // 3. Templates
  const body = `<h2>New season offer</h2><p onclick="steal()">Hi {{contact_name}}</p><img src="${imgUrl}" style="max-width:100%"><script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://example.com/catalog">Catalogue</a>`;
  const t1 = await call('POST', '/email/templates', A.token, { name: 'Offer', subject: 'Fresh {{product}} for {{company_name}}', body });
  const saved = t1.data?.data?.body || '';
  rec('EM-07', 'Owner', 'Save template; scripts/handlers/js-links removed, picture kept', '201 clean', `${t1.status} script=${/script/i.test(saved)} onclick=${/onclick/i.test(saved)} img=${saved.includes(imgUrl)}`, t1.status === 201 && !/<script|onclick|javascript:/i.test(saved) && saved.includes(imgUrl) && saved.includes('https://example.com/catalog'));
  const empty = await call('POST', '/email/templates', A.token, { name: 'Empty', body: '<p> </p>' });
  const noName = await call('POST', '/email/templates', A.token, { body: '<p>x</p>' });
  rec('EM-08', 'Owner', 'Empty body / missing name', '400 / 400', `${empty.status} / ${noName.status}`, empty.status === 400 && noName.status === 400);
  const upd = await call('PUT', `/email/templates/${t1.data.data.id}`, A.token, { name: 'Offer v2' });
  rec('EM-09', 'Owner', 'Rename a template', '200 Offer v2', `${upd.status} ${upd.data?.data?.name}`, upd.status === 200 && upd.data.data.name === 'Offer v2' && upd.data.data.body === saved);
  const bList = await call('GET', '/email/templates', B.token);
  const bPut = await call('PUT', `/email/templates/${t1.data.data.id}`, B.token, { name: 'hack' });
  const bDel = await call('DELETE', `/email/templates/${t1.data.data.id}`, B.token);
  rec('EM-10', 'Other company', 'Cannot see, edit or delete another company\'s template', '0 / 404 / 404', `${bList.data.data.length} / ${bPut.status} / ${bDel.status}`, bList.data.data.length === 0 && bPut.status === 404 && bDel.status === 404);
  const stTpl = await call('GET', '/email/templates', ST);
  rec('EM-11', 'Staff', 'Staff cannot open email templates (owner only)', '403', stTpl.status, stTpl.status === 403);
  clearUsageCache();
  const fp = tenantFootprint(A.user);
  rec('EM-12', 'Owner', 'Templates and pictures count in company storage', '1 template, 1 image', `${fp.groups.emailTemplates.length} ${fp.groups.emailImages.length}`, fp.groups.emailTemplates.length === 1 && fp.groups.emailImages.length === 1);

  // 4. Scheduling
  const audience = { mode: 'custom', emails: [`buyer1${u}@x.com`, `buyer2${u}@x.com`] };
  const past = await call('POST', '/email/campaigns', A.token, { name: 'P', subject: 'S', body: saved, audience, scheduled_at: new Date(Date.now() - 60000).toISOString() });
  const bad = await call('POST', '/email/campaigns', A.token, { name: 'P', subject: 'S', body: saved, audience, scheduled_at: 'tomorrow-ish' });
  const noSender = await call('POST', '/email/campaigns', B.token, { name: 'P', subject: 'S', body: '<p>x</p>', audience, scheduled_at: inFuture(30) });
  rec('EM-13', 'Owner', 'Schedule in the past / bad date / without a sender', '400 / 400 / 400', `${past.status} / ${bad.status} / ${noSender.status}`, past.status === 400 && bad.status === 400 && noSender.status === 400);
  const when = inFuture(10);
  const sc = await call('POST', '/email/campaigns', A.token, { name: 'Diwali offer', subject: 'Offer for {{company_name}}', body: saved, audience, scheduled_at: when });
  const cid = sc.data?.data?.id;
  rec('EM-14', 'Owner', 'Schedule a campaign for later', '201 scheduled', `${sc.status} ${sc.data?.data?.status} ${sc.data?.data?.scheduled_at === when}`, sc.status === 201 && sc.data.data.status === 'scheduled' && sc.data.data.scheduled_at === when);
  const early = await email.runScheduledCampaigns(Date.now());
  rec('EM-15', 'Server', 'Nothing is sent before the scheduled time', '0 started', early, early === 0 && dataStore.emailCampaigns.find((c) => c.id === cid).status === 'scheduled');
  const un = await call('POST', `/email/campaigns/${cid}/unschedule`, A.token);
  const re = await call('POST', `/email/campaigns/${cid}/schedule`, A.token, { scheduled_at: when });
  rec('EM-16', 'Owner', 'Cancel the schedule, then schedule again', 'draft → scheduled', `${un.data?.data?.status} → ${re.data?.data?.status}`, un.status === 200 && un.data.data.status === 'draft' && re.status === 200 && re.data.data.status === 'scheduled');
  const before = outbox.length;
  dataStore.emailSettings.find((s) => s.owner_id === A.id).rate_per_minute = 120;
  const started = await email.runScheduledCampaigns(Date.parse(when) + 1000);
  for (let i = 0; i < 40 && dataStore.emailCampaigns.find((c) => c.id === cid).status === 'sending'; i++) await wait(150);
  const done = dataStore.emailCampaigns.find((c) => c.id === cid);
  const mails = outbox.slice(before);
  rec('EM-17', 'Server', 'At the scheduled time the campaign is sent to everyone', '1 started, 2 sent', `${started} ${done.status} sent=${done.sent}`, started === 1 && done.status === 'sent' && done.sent === 2 && mails.length === 2);
  const html = mails[0] ? mails[0].html : '';
  rec('EM-18', 'Buyer', 'Mail has the picture, personalised text, unsubscribe link, text version', 'img + unsubscribe + text', `${html.includes(imgUrl)} ${/Unsubscribe/.test(html)} ${Boolean(mails[0] && mails[0].text && !/<[a-z]/i.test(mails[0].text))}`, html.includes(imgUrl) && /unsubscribe/i.test(html) && mails[0].text && !/<[a-z]/i.test(mails[0].text) && /Offer for /.test(mails[0].subject));
  const notif = dataStore.notifications.find((n) => n.campaign_id === cid && n.target_user_id === A.id);
  rec('EM-19', 'Owner', 'Owner gets a notification when the scheduled campaign starts', 'notification', notif ? notif.title : 'none', Boolean(notif));

  // scheduled campaign whose owner lost the feature
  const sc2 = await call('POST', '/email/campaigns', A.token, { name: 'Later', subject: 'S', body: '<p>Hello</p>', audience, scheduled_at: inFuture(20) });
  A.user.features.email_marketing = false;
  await email.runScheduledCampaigns(Date.now() + 21 * 60000);
  const c2 = dataStore.emailCampaigns.find((c) => c.id === sc2.data.data.id);
  rec('EM-20', 'Server', 'Feature switched off before the time: not sent, reason saved', 'failed + reason', `${c2.status} ${c2.error.slice(0, 40)}`, c2.status === 'failed' && /switched off/.test(c2.error));
  A.user.features.email_marketing = true;
  const sc3 = await call('POST', '/email/campaigns', A.token, { name: 'Now', subject: 'S', body: '<p>Hello</p>', audience, scheduled_at: inFuture(20) });
  const now3 = await call('POST', `/email/campaigns/${sc3.data.data.id}/send`, A.token, {});
  rec('EM-21', 'Owner', '"Send now" on a scheduled campaign', '200 sending', `${now3.status} ${now3.data?.data?.status}`, now3.status === 200 && ['sending', 'sent'].includes(now3.data.data.status));
  const sc4 = await call('POST', '/email/campaigns', A.token, { name: 'Del', subject: 'S', body: '<p>Hello</p>', audience, scheduled_at: inFuture(20) });
  const del4 = await call('DELETE', `/email/campaigns/${sc4.data.data.id}`, A.token);
  const bSend = await call('POST', `/email/campaigns/${sc4.data.data.id}/schedule`, B.token, { scheduled_at: inFuture(30) });
  rec('EM-22', 'Owner / Other company', 'Delete a scheduled campaign; another company cannot touch it', '200 / 404', `${del4.status} / ${bSend.status}`, del4.status === 200 && bSend.status === 404);

  // 5. Unused pictures are cleaned up, used ones stay
  const orphan = (await call('POST', '/email/images', A.token, { data_url: jpg })).data.data.id;
  dataStore.emailImages.forEach((i) => { if (i.owner_id === A.id) i.created_at = new Date(Date.now() - 8 * 86400000).toISOString(); });
  await call('POST', '/email/images', A.token, { data_url: jpg });
  const ids = dataStore.emailImages.filter((i) => i.owner_id === A.id).map((i) => i.id);
  rec('EM-23', 'Server', 'Old unused pictures removed, pictures used in templates kept', 'orphan gone, used kept', `${!ids.includes(orphan)} ${ids.includes(up.data.data.id)}`, !ids.includes(orphan) && ids.includes(up.data.data.id));
  for (let i = 0; i < 40 && dataStore.emailCampaigns.some((c) => c.status === 'sending'); i++) await wait(150);

  // 6. Daily limit, open / click tracking, dashboard, t_lead history (company B, so A's earlier mails do not count)
  const envCfg = require('../config/env');
  const local = (url) => url.replace(envCfg.apiPublicUrl, ORIGIN);
  const waitIdle = async () => { for (let i = 0; i < 80 && dataStore.emailCampaigns.some((c) => c.owner_id === B.id && c.status === 'sending'); i++) await wait(150); };
  const bSet = await call('PUT', '/email/settings', B.token, { provider: 'gmail', host: 'smtp.gmail.com', port: 587, user: `bilal${u}@gmail.com`, pass: 'abcdefghijklmnop', rate_per_minute: 120, daily_limit: 3 });
  const bDefault = (await call('PUT', '/email/settings', A.token, { provider: 'gmail', host: 'smtp.gmail.com', port: 587, user: `asha${u}@gmail.com`, daily_limit: '' })).data?.data;
  rec('EM-24', 'Owner', 'Daily limit can be set; blank = safe Gmail default', '3 / 450', `${bSet.data?.data?.daily_limit} / ${bDefault?.daily_limit}`, bSet.status === 200 && bSet.data.data.daily_limit === 3 && bDefault.daily_limit === 450);

  const t_lead = await call('POST', '/leads', B.token, { company_name: `Track Buyer ${u}`, name: `Track Buyer ${u}`, email: `trackbuyer${u}@x.com`, country: 'Netherlands', tags: ['trk'], stage: 'Lead Generation', follow_up_date: '2030-01-01', follow_up_time: '10:00', today_remarks: 'x', next_follow_up_action: 'y' });
  const leadId = t_lead.data?.data?.id;
  const trkBefore = outbox.length;
  const t_tc = await call('POST', '/email/campaigns', B.token, { name: 'Tracked', subject: 'Hi {{company_name}}', body: '<p>Hello</p><p><a href="https://example.com/catalog?a=1&amp;b=2">Catalogue</a> <a href="mailto:x@y.com">t_mail</a></p>', audience: { mode: 'tags', tags: ['trk'] } });
  await call('POST', `/email/campaigns/${t_tc.data.data.id}/send`, B.token, {});
  await waitIdle();
  const t_mail = outbox[trkBefore] || {};
  const t_pixel = (String(t_mail.html).match(/src="([^"]+\/email\/t\/o\/[^"]+)"/) || [])[1] || '';
  const t_link = ((String(t_mail.html).match(/href="([^"]+\/email\/t\/c\/[^"]+)"/) || [])[1] || '').replace(/&amp;/g, '&');
  rec('EM-25', 'Server', 'Campaign mail carries an open pixel and a tracked link; mailto and unsubscribe untouched', 'pixel + 1 tracked link', `${leadId ? 'lead' : 'nolead'} ${Boolean(t_pixel)} ${Boolean(t_link)} mailto=${String(t_mail.html).includes('mailto:x@y.com')} unsub=${/\/email\/unsubscribe\//.test(String(t_mail.html))}`, Boolean(leadId && t_pixel && t_link) && String(t_mail.html).includes('mailto:x@y.com') && /\/email\/unsubscribe\//.test(String(t_mail.html)));

  const o1 = await fetch(local(t_pixel));
  await fetch(local(t_pixel));
  const tcRec = dataStore.emailCampaigns.find((c) => c.id === t_tc.data.data.id);
  rec('EM-26', 'Email app', 'Opening twice: 1 unique open, 2 opens, picture is a GIF', '200 gif, opened 1, opens 2', `${o1.status} ${o1.headers.get('content-type')} ${tcRec.opened} ${tcRec.recipients[0].opens}`, o1.status === 200 && o1.headers.get('content-type') === 'image/gif' && tcRec.opened === 1 && tcRec.recipients[0].opens === 2);

  const t_bad = await fetch(local(t_link).replace('example.com', 'evil.example'), { redirect: 'manual' });
  const fakeTok = await fetch(`${ORIGIN}/api/v1/email/t/o/abc.def.gif`);
  const t_good = await fetch(local(t_link), { redirect: 'manual' });
  rec('EM-27', 'Buyer', 'Tracked t_link goes to the real page; a changed link or fake token is refused / ignored', '302 to catalog, 400, gif', `${t_good.status} ${t_good.headers.get('location')} ${t_bad.status} ${fakeTok.status}`, t_good.status === 302 && t_good.headers.get('location') === 'https://example.com/catalog?a=1&b=2' && t_bad.status === 400 && fakeTok.status === 200 && tcRec.clicked === 1 && tcRec.opened === 1);

  const t_lim = await call('POST', '/email/campaigns', B.token, { name: 'Over limit', subject: 'S', body: '<p>Hello</p>', audience: { mode: 'custom', emails: [1, 2, 3, 4, 5].map((n) => `t_lim${n}${u}@x.com`) } });
  await call('POST', `/email/campaigns/${t_lim.data.data.id}/send`, B.token, {});
  await waitIdle();
  const limC = dataStore.emailCampaigns.find((c) => c.id === t_lim.data.data.id);
  const t_again = await call('POST', `/email/campaigns/${t_lim.data.data.id}/send`, B.token, {});
  rec('EM-28', 'Server', 'Daily limit 3 (1 already sent): sends 2, then waits; Send is refused while waiting', 'waiting_limit, 2 sent, 409', `${limC.status} ${limC.sent} ${t_again.status}`, limC.status === 'waiting_limit' && limC.sent === 2 && Boolean(limC.resume_at) && t_again.status === 409);

  const t_dash = (await call('GET', '/email/dashboard?days=30', B.token)).data?.data || {};
  rec('EM-29', 'Owner', 'Dashboard: 3/3 used, 0 left, 3 sent, 1 opened, 1 clicked, 1 waiting', '3 0 3 1 1 1', `${t_dash.limit?.sent_24h} ${t_dash.limit?.left} ${t_dash.totals?.sent} ${t_dash.totals?.opened} ${t_dash.totals?.clicked} ${t_dash.limit?.waiting_campaigns?.length}`, t_dash.limit?.sent_24h === 3 && t_dash.limit.left === 0 && t_dash.totals.sent === 3 && t_dash.totals.opened === 1 && t_dash.totals.clicked === 1 && t_dash.limit.waiting_campaigns.length === 1 && t_dash.totals.open_rate === 33.3 && t_dash.recent?.[0]?.what === 'clicked');

  // 24 hours later the scheduler continues the waiting campaign by itself
  dataStore.emailCampaigns.filter((c) => c.owner_id === B.id).forEach((c) => c.recipients.forEach((r) => { if (r.sent_at) r.sent_at = new Date(Date.now() - 25 * 3600e3).toISOString(); }));
  const resumed = await email.runScheduledCampaigns(Date.now() + 25 * 3600e3);
  await waitIdle();
  rec('EM-30', 'Server', 'After 24 hours the waiting campaign continues and finishes', 'resumed 1, sent 5', `${resumed} ${limC.status} ${limC.sent}`, resumed === 1 && limC.status === 'sent' && limC.sent === 5);

  const t_hist = await call('GET', `/email/lead/${leadId}`, B.token);
  const h = t_hist.data?.data?.mails?.[0] || {};
  const histOther = await call('GET', `/email/lead/${leadId}`, A.token);
  const dashStaff = await call('GET', '/email/dashboard', ST);
  rec('EM-31', 'Owner / Other company / Staff', 'Lead shows its mail opened + clicked; others cannot see it or the dashboard', 'opened+clicked, 404, 403', `${t_hist.status} ${Boolean(h.opened_at)} ${Boolean(h.clicked_at)} ${histOther.status} ${dashStaff.status}`, t_hist.status === 200 && Boolean(h.opened_at) && Boolean(h.clicked_at) && h.opens === 2 && histOther.status === 404 && dashStaff.status === 403);

  const aDash = (await call('GET', '/email/dashboard', A.token)).data?.data || {};
  rec('EM-32', 'Other company', "Company A's dashboard never shows company B's mails", 'no B activity', (aDash.recent || []).map((r) => r.email).join(',') || 'none', !(aDash.recent || []).some((r) => String(r.email).includes('trackbuyer')));

  server.close();
  const fails = results.filter((x) => x.result === 'FAIL');
  console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 66), actual: x.actual.slice(0, 50) })));
  console.log(`EMAIL SETUP / TEMPLATES / SCHEDULE: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
