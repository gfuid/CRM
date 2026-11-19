// A FAKE WhatsApp Cloud API (Meta Graph) for local checks and help videos. Never used in production.
// Start: node tools/help-videos/fake-meta.mjs 5099   then run the backend with WA_GRAPH_BASE=http://127.0.0.1:5099
// Any access token is accepted. Templates are approved the first time they are listed ("Sync").
import http from 'node:http';

export function startFakeMeta(port = 5099) {
  const state = { templates: [], sent: [], n: 0 };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://x');
      const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      const parts = url.pathname.split('/').filter(Boolean);
      if (req.method === 'GET' && parts.length === 1) return send(200, { id: parts[0], display_phone_number: '+91 98765 43210', verified_name: 'Nova Agro Exports', quality_rating: 'GREEN', messaging_limit_tier: 'TIER_1K' });
      if (parts[1] === 'message_templates' && req.method === 'GET') {
        state.templates.forEach((t) => { t.status = 'APPROVED'; });
        return send(200, { data: state.templates });
      }
      if (parts[1] === 'message_templates' && req.method === 'POST') {
        const t = JSON.parse(body || '{}');
        const rec = { id: `tpl${state.templates.length + 1}`, status: 'PENDING', ...t };
        state.templates.push(rec);
        return send(200, { id: rec.id, status: 'PENDING', category: t.category });
      }
      if (parts[1] === 'message_templates' && req.method === 'DELETE') {
        state.templates = state.templates.filter((t) => t.name !== url.searchParams.get('name'));
        return send(200, { success: true });
      }
      if (parts[1] === 'uploads') return send(200, { id: 'upload:fake' });
      if (parts[0] === 'upload:fake') return send(200, { h: 'FAKE_HANDLE' });
      if (parts[1] === 'messages') {
        const m = JSON.parse(body || '{}');
        if (m.status === 'read') return send(200, { success: true });
        state.n += 1;
        state.sent.push(m);
        return send(200, { messaging_product: 'whatsapp', messages: [{ id: `wamid.fake${state.n}` }] });
      }
      return send(404, { error: { message: `fake meta: ${req.method} ${url.pathname}` } });
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ state, close: () => server.close() })));
}

if (process.argv[1] && process.argv[1].endsWith('fake-meta.mjs')) {
  const port = Number(process.argv[2]) || 5099;
  startFakeMeta(port).then(() => console.log(`Fake WhatsApp API on 127.0.0.1:${port}`));
}
