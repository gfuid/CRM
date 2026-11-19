/**
 * Tests: AI Calling against a FAKE ElevenLabs API (no real calls are made).
 *   node src/scripts/ai-calls-test.js
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdm1n!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ai_calls_test_secret';
process.env.AI_CALL_TICK_MS = '600000'; // the test runs the scheduler by hand

const http = require('http');

// ---------- fake ElevenLabs ----------
const fakeState = { calls: [], patches: [], convs: {} };
const fake = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.headers['xi-api-key'] !== 'GOOD_KEY') return send(401, { detail: { message: 'Invalid API key' } });
    if (req.method === 'GET' && url.pathname === '/v1/convai/agents/agent_1') return send(200, { agent_id: 'agent_1', name: 'Nova sales' });
    if (req.method === 'PATCH' && url.pathname === '/v1/convai/agents/agent_1') { fakeState.patches.push(JSON.parse(body)); return send(200, { agent_id: 'agent_1' }); }
    if (req.method === 'GET' && url.pathname === '/v1/convai/phone-numbers') return send(200, [
      { phone_number_id: 'pn_in', phone_number: '+911234567890', provider: 'sip_trunk', label: 'Vobiz India' },
      { phone_number_id: 'pn_us', phone_number: '+15550001111', provider: 'twilio', label: 'Twilio US' },
    ]);
    if (req.method === 'POST' && /outbound-call$/.test(url.pathname)) {
      const b = JSON.parse(body);
      const id = `conv_${fakeState.calls.length + 1}`;
      fakeState.calls.push({ path: url.pathname, ...b, id });
      fakeState.convs[id] = { status: 'in-progress' };
      return send(200, { success: true, conversation_id: id });
    }
    const m = /^\/v1\/convai\/conversations\/([^/]+)(\/audio)?$/.exec(url.pathname);
    if (m && req.method === 'GET') {
      const conv = fakeState.convs[m[1]];
      if (!conv) return send(404, { detail: 'not found' });
      if (m[2]) { res.writeHead(200, { 'Content-Type': 'audio/mpeg' }); return res.end(Buffer.from('ID3fakeaudio')); }
      return send(200, { conversation_id: m[1], ...conv });
    }
    return send(404, { detail: `fake: ${req.method} ${url.pathname}` });
  });
});

const results = [];
const rec = (id, who, scenario, expected, actual, pass) => results.push({ id, who, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const u = Date.now();

(async () => {
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  process.env.ELEVENLABS_API_URL = `http://127.0.0.1:${fake.address().port}`;
  const app = require('../app');
  const { dataStore } = require('../repositories/dataStore');
  const ai = require('../controllers/aiCalls.controller');
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const BASE = `http://127.0.0.1:${server.address().port}/api/v1`;
  const call = async (method, path, token, body) => {
    const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data, headers: res.headers };
  };
  const reg = async (name) => { const r = await call('POST', '/auth/register', null, { name, email: `${name.toLowerCase()}${u}@t.com`, password: 'Owner123', company_name: `${name} Exports` }); return { token: r.data.data.token, id: r.data.data.user.id }; };
  const A = await reg('Rahul');
  const B = await reg('Other');
  const SA = (await call('POST', '/auth/admin-login', null, { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD })).data.data.token;

  // 1. Locked, then switched on
  const locked = await call('GET', '/ai-calls/settings', A.token);
  const on = await call('PATCH', `/admin/users/${A.id}/features`, SA, { ai_calling: true });
  rec('AI-01', 'Owner / Admin', 'AI Calling is locked until the admin switches it on', '403 then 200', `${locked.status} ${on.status}`, locked.status === 403 && locked.data.code === 'FEATURE_DISABLED' && on.status === 200);

  // 2. Connect ElevenLabs
  const bad = await call('PUT', '/ai-calls/settings', A.token, { api_key: 'WRONG', agent_id: 'agent_1' });
  const good = await call('PUT', '/ai-calls/settings', A.token, { api_key: 'GOOD_KEY', agent_id: 'agent_1' });
  const g = good.data?.data || {};
  rec('AI-02', 'Owner', 'Wrong key refused with the reason; right key reads the agent and both numbers', '400 / 2 numbers, agent name', `${bad.status} ${bad.data?.message?.slice(0, 30)} / ${good.status} ${g.numbers?.length} ${g.agent_name}`, bad.status === 400 && /Invalid API key/.test(bad.data.message) && good.status === 200 && g.numbers.length === 2 && g.agent_name === 'Nova sales');
  rec('AI-03', 'Owner', 'The API key is never sent back', 'hidden', JSON.stringify(g).includes('GOOD_KEY') ? 'LEAKED' : 'hidden', !JSON.stringify(g).includes('GOOD_KEY') && g.has_key);
  await call('PUT', '/ai-calls/settings/options', A.token, { default_number_id: 'pn_in', country_numbers: [{ prefix: '1', number_id: 'pn_us' }], window: { from_hour: 0, to_hour: 24, days: [0, 1, 2, 3, 4, 5, 6] }, max_attempts: 2, retry_hours: 1, concurrency: 5, rates: { currency: 'USD', ai_per_min: 0.09, phone_default_per_min: 0.2, countries: [{ prefix: '91', name: 'India', per_min: 0.01 }] } });

  // 3. Script -> agent
  const noScript = await call('POST', '/ai-calls/campaigns', A.token, { name: 'x', audience: { mode: 'custom', numbers: '+971501112222' } });
  const script = await call('PUT', '/ai-calls/settings/script', A.token, { company_intro: 'Indian exporter of spices', product_info: 'Turmeric, curcumin 3%+, 25 kg bags', goal: 'Find need, quantity and email', language: 'en' });
  const patch = fakeState.patches[0] || {};
  const prompt = patch.conversation_config?.agent?.prompt?.prompt || '';
  rec('AI-04', 'Owner', 'A campaign needs the script first; the script goes to the agent with AI disclosure and data fields', '400 / prompt + interested field', `${noScript.status} ${script.status} ${/AI assistant/.test(prompt)} ${Object.keys(patch.platform_settings?.data_collection || {}).join(',')}`, noScript.status === 400 && script.status === 200 && /AI assistant of "?Rahul Exports/.test(prompt) && /\{\{buyer_name\}\}/.test(prompt) && patch.platform_settings.data_collection.interested.type === 'boolean');

  // 4. Test call to my own number
  const test = await call('POST', '/ai-calls/test-call', A.token, { to: '+91 98765 43210' });
  const tc = fakeState.calls[0] || {};
  rec('AI-05', 'Owner', 'Test call goes out from the Indian number (SIP trunk) with the buyer variables', '200, sip-trunk, pn_in', `${test.status} ${tc.path} ${tc.agent_phone_number_id} ${tc.conversation_initiation_client_data?.dynamic_variables?.sender_company}`, test.status === 200 && /sip-trunk/.test(tc.path) && tc.agent_phone_number_id === 'pn_in' && tc.to_number === '+919876543210');

  // 5. Campaign by tag
  const mk = (name, country, phone, tags) => call('POST', '/leads', A.token, { company_name: name, name, country, contact_person: `${name} buyer`, phone, tags, product: 'Turmeric', stage: 'Lead Generation', follow_up_date: '2030-01-01', follow_up_time: '10:00', today_remarks: 'x', next_follow_up_action: 'y' });
  const lDubai = (await mk(`Al Noor ${u}`, 'United Arab Emirates', '+971 50 111 2222', ['ai'])).data.data;
  const lUS = (await mk(`US Foods ${u}`, 'United States', '+1 212 555 0100', ['ai'])).data.data;
  const lIn = (await mk(`Delhi Spices ${u}`, 'India', '+91 99999 00000', ['ai'])).data.data;
  await mk(`No Phone ${u}`, 'India', '', ['ai']);
  const prev = (await call('GET', '/ai-calls/audience/preview?mode=tags&tags=ai', A.token)).data.data;
  rec('AI-06', 'Owner', 'Audience by tag: 3 with phone numbers, 1 left out; cost estimate shown', '3 / 1 / cost', `${prev.count} ${prev.skipped} ${prev.est_cost_2min}`, prev.count === 3 && prev.skipped === 1 && prev.est_cost_2min > 0);
  const camp = await call('POST', '/ai-calls/campaigns', A.token, { name: 'Turmeric round 1', audience: { mode: 'tags', tags: ['ai'] } });
  await ai.tick();
  const placed = fakeState.calls.slice(1);
  const us = placed.find((c) => c.to_number === '+12125550100') || {};
  const dubai = placed.find((c) => c.to_number === '+971501112222') || {};
  rec('AI-07', 'Server', 'Campaign calls all 3; the US buyer from the US (Twilio) number, others from the Indian one', '3 calls, twilio for +1', `${placed.length} ${us.path} ${dubai.agent_phone_number_id}`, camp.status === 201 && placed.length === 3 && /twilio/.test(us.path) && us.agent_phone_number_id === 'pn_us' && dubai.agent_phone_number_id === 'pn_in' && dubai.conversation_initiation_client_data.dynamic_variables.buyer_name === `Al Noor ${u} buyer`);

  // 6. Results come back
  const conv = (c) => c.id;
  fakeState.convs[conv(dubai)] = { status: 'done', metadata: { call_duration_secs: 150, termination_reason: 'end_call' }, transcript: [{ role: 'agent', message: 'Hello, this is the AI assistant…' }, { role: 'user', message: 'Yes, we need 20 tons monthly. Send prices to ahmed@alnoor.ae' }], analysis: { transcript_summary: 'Buyer needs 20 MT turmeric monthly and wants prices by email.', data_collection_results: { interested: { value: true }, quantity: { value: '20 MT per month' }, email: { value: 'ahmed@alnoor.ae' } } } };
  fakeState.convs[conv(us)] = { status: 'done', metadata: { call_duration_secs: 70 }, transcript: [{ role: 'agent', message: 'Hello' }, { role: 'user', message: 'Busy, call me Friday 3 pm' }], analysis: { transcript_summary: 'Buyer busy, asked for a call on Friday 3 pm.', data_collection_results: { interested: { value: null }, callback_date: { value: '2030-02-01 15:00' } } } };
  const inCall = placed.find((c) => c.to_number === '+919999900000');
  fakeState.convs[conv(inCall)] = { status: 'done', metadata: { call_duration_secs: 4 }, transcript: [{ role: 'agent', message: 'Hello?' }], analysis: { transcript_summary: '', data_collection_results: {} } };
  fakeState.convs.conv_1 = { status: 'done', metadata: { call_duration_secs: 30 }, transcript: [{ role: 'agent', message: 'Hi' }, { role: 'user', message: 'test ok' }], analysis: { transcript_summary: 'Test', data_collection_results: {} } };
  await ai.tick();
  const calls = (await call('GET', '/ai-calls/calls', A.token)).data.data;
  const cD = calls.find((c) => c.to === '971501112222') || {};
  const cU = calls.find((c) => c.to === '12125550100') || {};
  const cI = calls.find((c) => c.to === '919999900000') || {};
  rec('AI-08', 'Owner', 'Outcomes: Dubai interested, US callback, India no answer', 'interested / callback / no_answer', `${cD.outcome} / ${cU.outcome} / ${cI.outcome}`, cD.outcome === 'interested' && cU.outcome === 'callback' && cI.outcome === 'no_answer');
  rec('AI-09', 'Owner', 'Cost = minutes x (AI + phone rate); 2.5 min to UAE at 0.09 + 0.20', '0.725', cD.cost, Math.abs(cD.cost - 0.725) < 0.001);
  const leadD = dataStore.leads.find((l) => l.id === lDubai.id);
  const leadU = dataStore.leads.find((l) => l.id === lUS.id);
  rec('AI-10', 'Lead', 'Interested lead: AI remark with qty/email, follow-up tomorrow, stage moved, email saved', 'remark + stage + email', `${leadD.previous_remarks[0].author} | ${leadD.stage} | ${leadD.email} | ${leadD.next_follow_up_action}`, leadD.previous_remarks[0].author === 'AI call' && /20 MT/.test(leadD.today_remarks) && leadD.stage === 'Contact Established' && leadD.email === 'ahmed@alnoor.ae' && /price list/i.test(leadD.next_follow_up_action));
  rec('AI-11', 'Lead', 'Callback lead: follow-up date and time set to what the buyer asked', '2030-02-01 15:00', `${leadU.follow_up_date} ${leadU.follow_up_time}`, leadU.follow_up_date === '2030-02-01' && leadU.follow_up_time === '15:00');
  const notif = (dataStore.notifications || []).find((n) => n.kind === 'ai_call' && n.target_user_id === A.id);
  rec('AI-12', 'Owner', 'The owner gets a bell notice for the interested buyer', 'notice', notif ? notif.title : 'none', Boolean(notif) && /interested/.test(notif.title));
  const leadIn = dataStore.leads.find((l) => l.id === lIn.id);
  rec('AI-13', 'Lead', 'No answer does not write a remark on the lead', 'unchanged', leadIn.today_remarks, leadIn.today_remarks === 'x');

  // 7. Retry later, recording, transcript
  const c1 = (await call('GET', `/ai-calls/campaigns/${camp.data.data.id}`, A.token)).data.data;
  const rIn = c1.recipients.find((r) => r.to === '919999900000');
  rec('AI-14', 'Server', 'Unanswered number is retried later (not at once)', 'pending, next_at later', `${rIn.status} ${rIn.attempts} ${Date.parse(rIn.next_at) > Date.now()}`, rIn.status === 'pending' && rIn.attempts === 1 && Date.parse(rIn.next_at) > Date.now() && c1.status === 'running');
  const before = fakeState.calls.length;
  await ai.tick();
  await ai.tick(Date.now() + 2 * 3600 * 1000);
  rec('AI-15', 'Server', 'Nothing is called again before the retry time; after it, the second try goes out', '+0 then +1', fakeState.calls.length - before, fakeState.calls.length - before === 1);
  const detail = (await call('GET', `/ai-calls/calls/${cD.id}`, A.token)).data.data;
  const audio = await fetch(`${BASE}/ai-calls/calls/${cD.id}/audio`, { headers: { Authorization: `Bearer ${A.token}` } });
  rec('AI-16', 'Owner', 'Call shows the transcript; the recording plays through the CRM (key stays on the server)', '2 lines, audio/mpeg', `${detail.transcript.length} ${audio.status} ${audio.headers.get('content-type')}`, detail.transcript.length === 2 && audio.status === 200 && audio.headers.get('content-type') === 'audio/mpeg');

  // 8. Do not call
  fakeState.convs[fakeState.calls[fakeState.calls.length - 1].id] = { status: 'done', metadata: { call_duration_secs: 20 }, transcript: [{ role: 'agent', message: 'Hello' }, { role: 'user', message: 'Do not call me again' }], analysis: { transcript_summary: 'Asked not to be called.', data_collection_results: { do_not_call: { value: true } } } };
  await ai.tick(Date.now() + 2 * 3600 * 1000);
  const leadIn2 = dataStore.leads.find((l) => l.id === lIn.id);
  const prev2 = (await call('GET', '/ai-calls/audience/preview?mode=tags&tags=ai', A.token)).data.data;
  rec('AI-17', 'Buyer', '"Do not call me" marks the lead and leaves it out of the next campaign', 'do_not_call, 2 left', `${leadIn2.do_not_call} ${prev2.count}`, leadIn2.do_not_call === true && prev2.count === 2);

  // 9. Office hours of the buyer
  await call('PUT', '/ai-calls/settings/options', A.token, { window: { from_hour: 10, to_hour: 11, days: [1, 2, 3, 4, 5] } });
  const camp2 = await call('POST', '/ai-calls/campaigns', A.token, { name: 'Hours', audience: { mode: 'custom', numbers: '+971 50 999 0000' } });
  const n0 = fakeState.calls.length;
  // A Saturday at 03:00 UTC = 07:00 Dubai: outside the window
  const sat = Date.UTC(2030, 0, 5, 3, 0);
  await ai.tick(sat);
  const outside = fakeState.calls.length - n0;
  // A Monday at 06:30 UTC = 10:30 Dubai: inside
  await ai.tick(Date.UTC(2030, 0, 7, 6, 30));
  rec('AI-18', 'Server', 'Calls only in the buyer\'s own office hours (Dubai time)', 'Sat 07:00 no, Mon 10:30 yes', `${outside} then ${fakeState.calls.length - n0 - outside}`, camp2.status === 201 && outside === 0 && fakeState.calls.length - n0 === 1);

  // 10. Dashboard, pause, isolation, staff
  const dash = (await call('GET', '/ai-calls/dashboard', A.token)).data.data;
  rec('AI-19', 'Owner', 'Dashboard: calls, answered, interested, minutes, cost, by country (test calls not counted)', 'interested 1, callback 1, countries', `calls=${dash.totals.calls} ans=${dash.totals.answered} int=${dash.totals.interested} cb=${dash.totals.callback} min=${dash.totals.minutes} cost=${dash.totals.cost} countries=${dash.countries.length}`, dash.totals.interested === 1 && dash.totals.callback === 1 && dash.totals.calls >= 4 && dash.countries.length >= 3 && !calls.some((c) => c.test && dash.totals.calls === calls.length));
  const pause = await call('POST', `/ai-calls/campaigns/${camp2.data.data.id}/pause`, A.token);
  rec('AI-20', 'Owner', 'A campaign can be paused', 'paused', pause.data?.data?.status, pause.status === 200 && pause.data.data.status === 'paused');
  await call('PATCH', `/admin/users/${B.id}/features`, SA, { ai_calling: true });
  const bCalls = (await call('GET', '/ai-calls/calls', B.token)).data.data;
  const bAudio = await call('GET', `/ai-calls/calls/${cD.id}/audio`, B.token);
  const bCamp = await call('GET', `/ai-calls/campaigns/${camp.data.data.id}`, B.token);
  rec('AI-21', 'Other company', 'Another company sees no calls, cannot play recordings or open campaigns', '0, 404, 404', `${bCalls.length} ${bAudio.status} ${bCamp.status}`, bCalls.length === 0 && bAudio.status === 404 && bCamp.status === 404);
  await call('POST', '/admin/users', A.token, { name: 'Staffer', email: `aist${u}@t.com`, password: 'Staff123' });
  const ST = (await call('POST', '/auth/login', null, { email: `aist${u}@t.com`, password: 'Staff123' })).data.data.token;
  const staffTry = await call('GET', '/ai-calls/calls', ST);
  rec('AI-22', 'Staff', 'Staff cannot open AI Calling', '403', staffTry.status, staffTry.status === 403);

  server.close();
  fake.close();
  const fails = results.filter((x) => x.result === 'FAIL');
  console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 70), actual: x.actual.slice(0, 50) })));
  console.log(`AI CALLING: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
