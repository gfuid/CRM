// A FAKE ElevenLabs Agents API for local checks and help videos. Never used in production.
// Start: node tools/help-videos/fake-elevenlabs.mjs 5098  and run the backend with ELEVENLABS_API_URL=http://127.0.0.1:5098
// Any API key and agent id work. A call "finishes" 4 seconds after it starts, with a result that depends on the number:
//   ...2222 interested, ...0100 call back, ending in 0 no answer, anything else not interested.
import http from 'node:http';

export function startFakeElevenLabs(port = 5098) {
  const convs = {};
  let n = 0;
  const result = (to) => {
    if (to.endsWith('2222')) return { secs: 154, summary: 'Buyer imports about 20 MT of turmeric a month from Vietnam. Interested in Indian turmeric with 3% curcumin; asked for CIF Jebel Ali price and a sample. Email given.', data: { interested: { value: true }, quantity: { value: '20 MT per month' }, email: { value: 'purchase@alnoor.example' }, notes: { value: 'Wants CIF Jebel Ali price and a sample' } }, turns: [['agent', 'Hello Ahmed, this is the AI assistant of Nova Agro Exports. Do you have one minute to talk about turmeric?'], ['user', 'Yes, go ahead.'], ['agent', 'We export turmeric finger with 3% curcumin from India. Do you buy turmeric at the moment?'], ['user', 'Yes, around 20 tons a month, mostly from Vietnam.'], ['agent', 'Would you like our price list and a sample? Which email should we use?'], ['user', 'Send it to purchase at alnoor dot example, CIF Jebel Ali please.'], ['agent', 'Thank you, our team will email the price list today. Have a nice day!']] };
    if (to.endsWith('0100')) return { secs: 48, summary: 'Buyer is in a meeting and asked to be called back on Friday at 3 pm.', data: { callback_date: { value: '2030-02-01 15:00' } }, turns: [['agent', 'Hello, this is the AI assistant of Nova Agro Exports.'], ['user', 'I am busy now, call me Friday at 3 pm.'], ['agent', 'Of course, I will call you on Friday at 3 pm. Thank you!']] };
    if (to.endsWith('0')) return { secs: 0, summary: '', data: {}, turns: [] };
    return { secs: 35, summary: 'Buyer already has a supplier and is not interested now.', data: { interested: { value: false } }, turns: [['agent', 'Hello, this is the AI assistant of Nova Agro Exports.'], ['user', 'We have a supplier, not interested.'], ['agent', 'Understood, thank you for your time.']] };
  };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://x');
      const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (/^\/v1\/convai\/agents\//.test(url.pathname)) return send(200, { agent_id: url.pathname.split('/').pop(), name: 'Nova sales agent' });
      if (url.pathname === '/v1/convai/phone-numbers') return send(200, [
        { phone_number_id: 'pn_vobiz', phone_number: '+918045671234', provider: 'sip_trunk', label: 'Vobiz India' },
        { phone_number_id: 'pn_twilio', phone_number: '+12125559876', provider: 'twilio', label: 'Twilio US' },
      ]);
      if (/outbound-call$/.test(url.pathname)) {
        const b = JSON.parse(body || '{}');
        n += 1;
        const id = `conv_fake_${n}`;
        convs[id] = { to: String(b.to_number || ''), at: Date.now() };
        return send(200, { success: true, conversation_id: id });
      }
      const m = /^\/v1\/convai\/conversations\/([^/]+)(\/audio)?$/.exec(url.pathname);
      if (m) {
        const c = convs[m[1]];
        if (!c) return send(404, { detail: 'not found' });
        if (m[2]) { res.writeHead(200, { 'Content-Type': 'audio/mpeg' }); return res.end(Buffer.alloc(2000)); }
        if (Date.now() - c.at < 4000) return send(200, { status: 'in-progress' });
        const r = result(c.to);
        return send(200, { status: 'done', metadata: { call_duration_secs: r.secs, termination_reason: r.secs ? 'Call ended by the agent' : 'No answer' }, transcript: r.turns.map(([role, message]) => ({ role, message })), analysis: { transcript_summary: r.summary, data_collection_results: r.data } });
      }
      return send(404, { detail: `fake elevenlabs: ${req.method} ${url.pathname}` });
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ convs, close: () => server.close() })));
}

if (process.argv[1] && process.argv[1].endsWith('fake-elevenlabs.mjs')) {
  const port = Number(process.argv[2]) || 5098;
  startFakeElevenLabs(port).then(() => console.log(`Fake ElevenLabs on 127.0.0.1:${port}`));
}
