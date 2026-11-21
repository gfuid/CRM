// A FAKE WhatsApp Cloud API (Meta Graph) for local checks and help videos. Never used in production.
// Start: node tools/help-videos/fake-meta.mjs 5099   then run the backend with WA_GRAPH_BASE=http://127.0.0.1:5099
// Any access token is accepted. Templates are approved the first time they are listed ("Sync").
import http from 'node:http';

export function startFakeMeta(port = 5099) {
  const state = { templates: [], sent: [], n: 0, social: [], containers: [] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://x');
      const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      const parts = url.pathname.split('/').filter(Boolean);
      // ---- Social Media: Facebook Page 5001 + Instagram 1784 (login dialog, tokens, posting) ----
      const q = url.searchParams;
      const form = Object.fromEntries(new URLSearchParams(body));
      const p = url.pathname;
      if (p === '/dialog/oauth') {
        // A pretend "Allow" page: goes straight back to the CRM with a code
        res.writeHead(302, { Location: `${q.get('redirect_uri')}?code=DEMO_CODE&state=${encodeURIComponent(q.get('state') || '')}` });
        return res.end();
      }
      if (p === '/oauth/access_token') return send(200, { access_token: q.get('code') ? 'DEMO_SHORT' : 'DEMO_LONG' });
      if (p === '/me/accounts') return send(200, { data: [{ id: '5001', name: 'Nova Agro Exports', access_token: 'DEMO_PAGE_TOKEN', instagram_business_account: { id: '1784', username: 'novaagro.exports' } }] });
      if (req.method === 'POST' && p === '/5001/feed') { state.social.push({ kind: 'feed', ...form }); return send(200, { id: `5001_${state.social.length}` }); }
      if (req.method === 'POST' && p === '/5001/photos') { state.social.push({ kind: 'photo', ...form }); return send(200, { id: 'ph1', post_id: `5001_${state.social.length}` }); }
      // Results + comments of published posts (numbers vary by post so the report can rank them)
      const fbm = /^\/5001_(\d+)(\/insights|\/comments)?$/.exec(p);
      const igm = /^\/igm(\d+)(\/insights|\/comments)?$/.exec(p);
      if (req.method === 'GET' && fbm && (fbm[2] || /reactions/.test(q.get('fields') || ''))) {
        const k = Number(fbm[1]);
        const pop = [40, 12, 95, 7, 30, 60][k % 6];
        if (fbm[2] === '/insights') return send(200, { data: [{ name: 'post_impressions_unique', values: [{ value: pop * 23 }] }, { name: 'post_clicks', values: [{ value: Math.round(pop / 4) }] }] });
        if (fbm[2] === '/comments') return send(200, { data: k % 3 === 1 ? [{ id: `c_5001_${k}_1`, from: { id: '901', name: 'Ahmed Al-Mansoor' }, message: 'Please send CIF Jebel Ali price for 20 MT', created_time: new Date().toISOString() }] : [] });
        return send(200, { reactions: { summary: { total_count: pop } }, comments: { summary: { total_count: k % 3 === 1 ? 1 : 0 } }, shares: { count: Math.round(pop / 10) } });
      }
      if (req.method === 'GET' && igm && (igm[2] || /like_count/.test(q.get('fields') || ''))) {
        const k = Number(igm[1]);
        const pop = [70, 25, 140, 15][k % 4];
        if (igm[2] === '/insights') return send(200, { data: [{ name: 'reach', values: [{ value: pop * 18 }] }, { name: 'saved', values: [{ value: Math.round(pop / 7) }] }, { name: 'shares', values: [{ value: Math.round(pop / 20) }] }] });
        if (igm[2] === '/comments') return send(200, { data: k % 2 ? [{ id: `igc_${k}`, username: 'saigon_feed_mill', text: 'Interested in maize, what is your MOQ?', timestamp: new Date().toISOString() }] : [] });
        return send(200, { like_count: pop, comments_count: k % 2 });
      }
      if (req.method === 'POST' && /^\/(c_5001_\d+_\d+|igc_\d+)\/(comments|replies)$/.test(p)) { state.replies = [...(state.replies || []), { path: p, ...form }]; return send(200, { id: `reply${(state.replies || []).length}` }); }
      if (req.method === 'GET' && /^\/5001_\d+$/.test(p)) return send(200, { permalink_url: `https://www.facebook.com/novaagro/posts${p}` });
      if (req.method === 'POST' && p === '/1784/media') { state.containers.push(form); return send(200, { id: `cont${state.containers.length}` }); }
      if (req.method === 'GET' && /^\/cont\d+$/.test(p)) return send(200, { status_code: 'FINISHED' });
      if (req.method === 'POST' && p === '/1784/media_publish') { state.social.push({ kind: 'instagram', ...state.containers[Number(String(form.creation_id).slice(4)) - 1] }); return send(200, { id: `igm${state.social.length}` }); }
      if (req.method === 'GET' && /^\/igm\d+$/.test(p)) return send(200, { permalink: `https://www.instagram.com/p/demo${p.slice(4)}` });
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
