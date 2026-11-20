// A FAKE AI server for local checks and help videos (Anthropic Messages API + OpenAI-style chat / images). Never used in production.
// Start: node tools/help-videos/fake-ai.mjs 5097  and run the backend with
//   AI_ANTHROPIC_BASE=http://127.0.0.1:5097  AI_OPENAI_BASE=http://127.0.0.1:5097/openai
// Any key works except one containing "WRONG".
import http from 'node:http';
import zlib from 'node:zlib';

// A small orange PNG "photo" (made here so no file is needed)
function png(w = 512, h = 512) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3);
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - w * 0.62, y - h * 0.5) / (w * 0.32);
      const ball = d < 1;
      row[1 + x * 3] = ball ? 245 - d * 40 : 217 - y / 8; row[2 + x * 3] = ball ? 170 - d * 70 : 119 - y / 10; row[3 + x * 3] = ball ? 40 : 6;
    }
    rows.push(row);
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}

const POST = {
  facebook: 'New crop turmeric is ready for export! 🌿\n\nOur turmeric fingers have 3%+ curcumin, are machine-cleaned and packed in 25 kg PP bags. Lab report with every lot.\n\nImporters and distributors: ask us for today\'s CIF price to your port.',
  instagram: 'New crop turmeric is here 🌿✨\nCurcumin 3%+ · 25 kg bags · ready to ship\nDM us for your CIF price 📦\n\n#turmeric #spices #export #indianspices #agroexports #wholesale #importers',
  image_idea: 'Golden turmeric fingers spilling from a jute sack on a wooden table, warm daylight',
};

export function startFakeAi(port = 5097) {
  const picture = png();
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      const b = body ? JSON.parse(body) : {};
      const key = String(req.headers['x-api-key'] || req.headers.authorization || '');
      await new Promise((r) => setTimeout(r, 900)); // feels like a real AI call
      if (req.url.startsWith('/v1/messages')) {
        if (/WRONG/.test(key)) return send(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
        const ideas = /plan a month/.test(String(b.system));
        const text = /Say OK/.test(JSON.stringify(b.messages)) ? 'OK' : ideas ? JSON.stringify({ ideas: [
          { date: '', title: 'New crop turmeric is ready', brief: 'Photo of the new crop with curcumin %, invite buyers to ask for CIF price.', platforms: ['facebook', 'instagram'] },
          { date: '', title: 'Inside our cleaning and grading unit', brief: 'Short behind-the-scenes post about quality checks.', platforms: ['facebook', 'instagram'] },
          { date: '', title: 'Container loaded for Dubai', brief: 'Shipment photo, thank the buyer (no names).', platforms: ['facebook'] },
          { date: '', title: 'Meet us at Gulfood', brief: 'Trade fair stand number and dates.', platforms: ['facebook', 'instagram'] },
        ] }) : JSON.stringify(POST);
        return send(200, { id: 'msg_fake', type: 'message', role: 'assistant', model: b.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 50, output_tokens: 120 } });
      }
      if (req.url === '/openai/chat/completions') {
        if (/WRONG/.test(key)) return send(401, { error: { message: 'Incorrect API key provided' } });
        return send(200, { choices: [{ message: { role: 'assistant', content: JSON.stringify(POST) } }] });
      }
      if (req.url === '/openai/images/generations') {
        if (/WRONG/.test(key)) return send(401, { error: { message: 'Incorrect API key provided' } });
        return send(200, { data: [{ b64_json: picture.toString('base64') }] });
      }
      return send(404, { error: { message: `fake ai: ${req.url}` } });
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ close: () => server.close() })));
}

if (process.argv[1] && process.argv[1].endsWith('fake-ai.mjs')) {
  const port = Number(process.argv[2]) || 5097;
  startFakeAi(port).then(() => console.log(`Fake AI on 127.0.0.1:${port}`));
}
