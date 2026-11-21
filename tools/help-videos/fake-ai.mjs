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

const BRAND = {
  company: 'Nova Agro Exports Pvt Ltd', website: 'www.novaagro.example', about: 'Indian exporter of turmeric, maize and rice DDGS with its own cleaning and grading unit in Kerala.',
  products: 'Turmeric finger (curcumin 3%+), Maize (feed grade), Rice DDGS (protein 45%+)', certifications: 'APEDA, Spices Board, FSSAI',
  countries: 'UAE, Saudi Arabia, Vietnam, Bangladesh', buyers: 'Importers, spice traders and feed mills', usp: 'Own processing unit and a lab report with every lot',
  competitors: 'Vietnam and Myanmar suppliers', tone: 'professional and friendly', language: 'English', goal: 'Get enquiries from importers',
  cta: 'WhatsApp us for today\'s CIF price', avoid: 'No prices in posts', photos: 'Product close-ups, packing, container loading',
};
// Posts on Tue / Thu / Sat of the month, rotating four pillars
function monthPlan(month) {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = new Date().toISOString().slice(0, 10);
  const topics = [
    ['Product', 'photo', 'New crop turmeric is ready', 'Close-up of turmeric fingers, curcumin 3%+, invite importers to ask for the CIF price.', ['facebook', 'instagram']],
    ['Quality', 'carousel', 'How we clean and grade every lot', 'Steps in our unit: cleaning, polishing, grading, lab test.', ['facebook', 'instagram']],
    ['Shipments', 'photo', 'Another container on its way to Dubai', 'Loading photo, thank the buyer without naming them.', ['facebook']],
    ['Market', 'text', 'Turmeric market this week', 'Short note on crop arrivals and demand, no prices.', ['facebook']],
  ];
  const items = [];
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (![2, 4, 6].includes(wd) || date < today) continue;
    const t = topics[items.length % topics.length];
    items.push({ date, time: wd === 6 ? '11:00' : '10:30', platforms: t[4], pillar: t[0], format: t[1], title: t[2], brief: t[3] });
  }
  return {
    summary: 'This month we show the new crop and our quality process, and prove reliability with shipments. Posts go out on Gulf and Asian business mornings.',
    pillars: [{ name: 'Product', share: 35, why: 'Buyers first want to see the goods' }, { name: 'Quality', share: 25, why: 'Lab reports and process build trust' }, { name: 'Shipments', share: 25, why: 'Proof that we deliver' }, { name: 'Market', share: 15, why: 'Shows expertise, starts conversations' }],
    best_times: [{ day: 'Tuesday', time: '10:30', why: 'Gulf buyers start their week early' }, { day: 'Thursday', time: '10:30', why: 'Before the Gulf weekend' }, { day: 'Saturday', time: '11:00', why: 'Working day in the Gulf and Asia' }],
    items,
  };
}

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
        ] }) : /Review last month/.test(String(b.system)) ? JSON.stringify({
          summary: 'Shipment and product photos got the most likes and the only buyer enquiries. Text-only market notes were seen but few people reacted. Tuesday mornings did best.',
          worked: ['Container loading photos (proof that we deliver)', 'Product close-ups on Tuesday mornings', 'Instagram for reach, Facebook for enquiries'],
          not_worked: ['Text-only market notes', 'Saturday posts'],
          next_month: ['More Shipments posts (30% → 40%)', 'Replace text notes with a photo or carousel', 'Post Tuesday and Thursday 10:30', 'Reply to every comment within a day'],
        }) : /prepare the brand profile/.test(String(b.system)) ? JSON.stringify(BRAND)
          : /Plan one month of posts/.test(String(b.system)) ? JSON.stringify(monthPlan((/Month: (\d{4}-\d{2})/.exec(JSON.stringify(b.messages)) || [])[1] || '2030-01'))
          : JSON.stringify(POST);
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
