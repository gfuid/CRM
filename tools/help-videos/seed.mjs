/**
 * Demo company for the help videos. Every name, company and number here is made up.
 * Runs against a LOCAL in-memory backend only (never the live server).
 */
const pw = () => `Demo#${Math.random().toString(36).slice(2, 10)}9A`;
const day = (offset) => {
  const d = new Date(Date.now() + offset * 864e5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// oneStaff: only Priya (new companies may have 2 staff, so the "create staff" video needs a free seat)
// email: 'setup' = Email Marketing switched on, not connected yet;
//        'campaign' = connected to the local SMTP sink (smtp-sink.mjs) with one campaign already sent, opened and clicked
// wa: 'setup' = WhatsApp Marketing on, not connected; 'full' = connected (fake Meta), approved template,
//     one broadcast with delivered/read ticks, buyer replies and auto-reply rules
// ai: 'setup' = AI Calling on, not connected; 'full' = connected (fake ElevenLabs), script saved, one finished campaign
export async function seedDemoCompany(api, { oneStaff = false, email = '', sink = null, wa = '', ai = '' } = {}) {
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(api)) throw new Error('Seeding is only allowed against a local backend');
  const call = async (path, method, body, token) => {
    const res = await fetch(api + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${data?.message || ''}`);
    return data.data;
  };
  const stamp = Date.now();
  const ownerPw = pw();
  const reg = await call('/auth/register', 'POST', { name: 'Rahul Mehta', email: `rahul.${stamp}@demo.test`, password: ownerPw, company_name: 'Nova Agro Exports', persona: 'owner' });
  const owner = reg.token;
  const staffPw = pw();
  const priya = await call('/admin/users', 'POST', { name: 'Priya Sharma', email: `priya.${stamp}@demo.test`, password: staffPw, role: 'staff', department: 'Commodity Sales' }, owner);
  const arjun = oneStaff ? priya : await call('/admin/users', 'POST', { name: 'Arjun Nair', email: `arjun.${stamp}@demo.test`, password: pw(), role: 'staff', department: 'Lead Sourcing' }, owner);
  const priyaLogin = await call('/auth/login', 'POST', { email: `priya.${stamp}@demo.test`, password: staffPw });

  await call('/leads/options', 'PUT', { spec_fields: ['Protein %', 'Moisture %', 'Aflatoxin (ppb)'] }, owner);

  const leads = [
    { name: 'Logos Grain Traders Ltd', country: 'Nigeria', city: 'Lagos', state: 'Lagos', products: ['Jowar'], quantity: 100, price: 31000, stage: 'Contact Established', source: 'Trade Fair', assigned_to: priya.id, fu: 0, today: 'Shared Jowar price list and moisture spec.', next: 'Call for feedback on price', contact: 'Chidi Okafor', phone: '+234 803 555 2190' },
    { name: 'Thathsara Enterprises', country: 'Sri Lanka', city: 'Wattala', state: 'Western Province', pincode: '11300', products: ['Rice DDGS', 'Maize'], quantity: 28, price: 10350, stage: 'Requirement Understood', source: 'Customs Data', assigned_to: priya.id, fu: -2, today: 'Buyer asked for Rice DDGS protein report.', next: 'Send lab report and catalogue', contact: 'Nimal Perera', phone: '+94 77 980 0011' },
    { name: 'Saigon Feed Mill Co', country: 'Vietnam', city: 'Ho Chi Minh City', products: ['Corn DDGS'], quantity: 250, price: 72500, stage: 'Quotation Sent', source: 'Referral', assigned_to: arjun.id, fu: 1, today: 'Sent CIF quotation for 250 MT.', next: 'Follow up on quotation', contact: 'Tran Van Minh', phone: '+84 90 123 4567' },
    { name: 'Al-Zahra Trading LLC', country: 'United Arab Emirates', city: 'Al Quoz', state: 'Dubai', products: ['Turmeric'], quantity: 40, price: 68000, stage: 'Sample Sent', source: 'Direct Inquiry', fu: 0, today: 'Sample dispatched by courier.', next: 'Confirm sample received', contact: 'Ahmed Al-Mansoor', phone: '+971 50 111 2222' },
    { name: 'Global Agri Impex BV', country: 'Netherlands', city: 'Rotterdam', products: ['Rice DDGS'], quantity: 80, price: 95000, stage: 'Negotiation', source: 'Website', assigned_to: priya.id, fu: 3, today: 'Discussed payment terms (LC at sight).', next: 'Share revised proforma', contact: 'Lars Janssen', phone: '+31 20 555 4321' },
    { name: 'Kenya Poultry Feeds', country: 'Kenya', city: 'Nairobi', products: ['Maize', 'Soya seed'], quantity: 60, price: 21000, stage: 'Lead Generation', source: 'Cold Outreach', assigned_to: arjun.id, fu: -1, today: 'First email sent with company profile.', next: 'Call purchase manager', contact: 'Grace Wanjiru', phone: '+254 712 345 678' },
    { name: 'Dhaka Agro Industries', country: 'Bangladesh', city: 'Dhaka', products: ['DORB'], quantity: 120, price: 26400, stage: 'Closed Won', source: 'Trade Fair', assigned_to: priya.id, fu: 7, today: 'Order confirmed, LC received.', next: 'Book container', contact: 'Rafiq Hasan', phone: '+880 1711 234567' },
  ];
  // Email address + marketing tags for each demo buyer (made-up .example addresses)
  const TAGS = [['turmeric-buyer'], ['customs-data', 'rice-ddgs'], ['vietnam', 'hot'], ['dubai', 'turmeric-buyer'], ['turmeric-buyer', 'netherlands'], ['old-list'], ['old-list']];
  leads.forEach((l, i) => {
    l.email = `purchase@${l.name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 14)}.example`;
    l.tags = TAGS[i] || [];
  });
  const created = [];
  for (const l of leads) {
    const row = await call('/leads', 'POST', {
      name: l.name, company_name: l.name, country: l.country, city: l.city || '', state: l.state || '', pincode: l.pincode || '',
      products: l.products, quantity: l.quantity, quantity_unit: 'MT', price: l.price, value: l.price, stage: l.stage, source: l.source,
      ...(l.assigned_to ? { assigned_to: l.assigned_to } : {}),
      contacts: [{ name: l.contact, phone: l.phone, email: l.email, designation: 'Purchase Manager' }], contact_person: l.contact, phone: l.phone, whatsapp: l.phone, email: l.email, tags: l.tags,
      follow_up_date: day(l.fu), follow_up_time: '11:00', today_remarks: l.today, next_follow_up_action: l.next,
      export_requirements: { incoterm: 'CIF', port_delivery: '', quantity_unit: 'MT' },
    }, owner);
    created.push(row);
  }
  for (const [i, t] of [
    ['Send Rice DDGS lab report to Thathsara', priya.id, 0],
    ['Prepare CIF quote for Saigon Feed Mill', arjun.id, 1],
    ['Book container for Dhaka Agro order', priya.id, -1],
  ].entries()) {
    await call('/tasks', 'POST', { title: t[0], assigned_to: t[1], due_date: day(t[2]), priority: i === 0 ? 'High' : 'Medium', lead_id: created[i + 1]?.id }, owner);
  }
  await call('/activity', 'POST', { type: 'note', title: 'Call initiated', description: 'Spoke to Nimal, wants protein report.', lead_id: created[1].id }, owner);
  await call('/activity', 'POST', { type: 'note', title: 'Sample sent', description: 'DHL waybill shared on WhatsApp.', lead_id: created[3].id }, owner);

  if (email) await seedEmail(api, call, owner, reg.user.id, email, sink, stamp);
  if (wa) await seedWhatsApp(api, call, owner, reg.user.id, wa);
  if (ai) await seedAiCalls(call, owner, reg.user.id, ai);

  return { owner, staff: priyaLogin.token, priyaId: priya.id, arjunId: arjun.id, leads: created };
}

async function seedEmail(api, call, owner, ownerId, mode, sink, stamp) {
  const admin = await call('/auth/admin-login', 'POST', { username: process.env.HV_ADMIN_USER || 'admin', password: process.env.HV_ADMIN_PASS || 'admin123' });
  await call(`/admin/users/${ownerId}/features`, 'PATCH', { email_marketing: true }, admin.token);
  if (mode !== 'campaign') return;
  if (!sink) throw new Error('The campaign video needs the local SMTP sink');
  const port = Number(process.env.SINK_PORT || 2525);
  await call('/email/settings', 'PUT', { provider: 'custom', host: '127.0.0.1', port, secure: false, user: `rahul.${stamp}@novaagro.example`, pass: 'local-sink', from_name: 'Rahul from Nova Agro Exports', rate_per_minute: 120, daily_limit: 450 }, owner);
  await call('/email/templates', 'POST', { name: 'Turmeric price list', subject: 'Fresh turmeric for {{company_name}}', body: '<h2>New crop turmeric is ready</h2><p>Dear {{contact_name}},</p><p>Our new season turmeric (curcumin 3%+) is ready to ship. See the <a href="https://example.com/price-list">price list</a>.</p><p>Regards,<br/>Rahul, Nova Agro Exports</p>' }, owner);
  const before = sink.mails.length;
  const c = await call('/email/campaigns', 'POST', { name: 'Rice DDGS offer – October', subject: 'Rice DDGS for {{company_name}}', body: '<p>Dear {{contact_name}},</p><p>Rice DDGS, protein 45%+, ready for loading. See our <a href="https://example.com/rice-ddgs">specification sheet</a>.</p><p>Regards, Rahul</p>', audience: { mode: 'all' } }, owner);
  await call(`/email/campaigns/${c.id}/send`, 'POST', {}, owner);
  for (let i = 0; i < 60; i++) {
    const list = await call('/email/campaigns', 'GET', null, owner);
    if (!list.some((x) => x.status === 'sending')) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const qp = (raw) => raw.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
  const html = sink.mails.slice(before).map((m) => qp(m.raw));
  const pixels = html.map((h) => (h.match(/src="([^"]+\/email\/t\/o\/[^"]+)"/) || [])[1]).filter(Boolean);
  const links = html.map((h) => ((h.match(/href="([^"]+\/email\/t\/c\/[^"]+)"/) || [])[1] || '').replace(/&amp;/g, '&')).filter(Boolean);
  for (const p of pixels.slice(0, 4)) await fetch(p);
  for (const l of links.slice(1, 3)) await fetch(l, { redirect: 'manual' });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function switchOn(call, ownerId, flag) {
  const admin = await call('/auth/admin-login', 'POST', { username: process.env.HV_ADMIN_USER || 'admin', password: process.env.HV_ADMIN_PASS || 'admin123' });
  await call(`/admin/users/${ownerId}/features`, 'PATCH', { [flag]: true }, admin.token);
}

async function seedWhatsApp(api, call, owner, ownerId, mode) {
  await switchOn(call, ownerId, 'whatsapp_marketing');
  if (mode !== 'full') return;
  const { readFileSync } = await import('node:fs');
  const { createHmac } = await import('node:crypto');
  const SECRET = 'demo-app-secret';
  await call('/whatsapp/settings', 'PUT', { phone_number_id: '109876543210987', waba_id: '102345678901234', access_token: 'EAAG-demo-token', app_id: '123456789012345', app_secret: SECRET }, owner);
  const pic = readFileSync(new URL('./assets/turmeric-offer.jpg', import.meta.url)).toString('base64');
  const media = await call('/whatsapp/media', 'POST', { data_url: `data:image/jpeg;base64,${pic}` }, owner);
  const tpl = await call('/whatsapp/templates', 'POST', {
    name: 'turmeric_offer', category: 'MARKETING', language: 'en', header_type: 'image', header_media_id: media.id,
    body: 'Hello {{1}}, new crop {{2}} is ready to ship (curcumin 3%+, 25 kg bags). Reply PRICE for today\'s CIF price.', body_examples: ['Ahmed', 'turmeric'],
    footer: 'Nova Agro Exports', buttons: [{ type: 'QUICK_REPLY', text: 'Send price' }, { type: 'URL', text: 'Catalogue', url: 'https://example.com/catalogue' }],
  }, owner);
  await call('/whatsapp/templates', 'POST', { name: 'sample_dispatched', category: 'UTILITY', language: 'en', header_type: 'none', body: 'Dear {{1}}, your sample has been dispatched. Tracking: {{2}}.', body_examples: ['Ahmed', 'DHL 1234567890'] }, owner);
  await call('/whatsapp/templates/sync', 'POST', {}, owner);
  await call('/whatsapp/rules', 'POST', { name: 'Welcome', trigger: 'welcome', reply: 'Thanks for writing to Nova Agro Exports! Rahul will reply within one hour.' }, owner);
  await call('/whatsapp/rules', 'POST', { name: 'Price', trigger: 'keyword', keywords: 'price, rate', match: 'contains', reply: 'Today\'s CIF price list: https://example.com/prices' }, owner);
  const c = await call('/whatsapp/campaigns', 'POST', { name: 'Turmeric offer – November', template_id: tpl.id, audience: { mode: 'tags', tags: ['turmeric-buyer'] }, send_now: true, variables: [{ source: 'field', field: 'contact_name', fallback: 'Sir' }, { source: 'text', text: 'turmeric' }] }, owner);
  let camp = null;
  for (let i = 0; i < 60; i++) { camp = await call(`/whatsapp/campaigns/${c.id}`, 'GET', null, owner); if (camp.status !== 'sending' && camp.status !== 'draft') break; await sleep(200); }
  const settings = await call('/whatsapp/settings', 'GET', null, owner);
  const key = String(settings.webhook_url || '').split('/').pop();
  const hook = async (value) => {
    const payload = { object: 'whatsapp_business_account', entry: [{ id: '102345678901234', changes: [{ field: 'messages', value }] }] };
    const body = JSON.stringify(payload);
    await fetch(`${api}/whatsapp/webhook/${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}` }, body });
    await sleep(120);
  };
  const recips = (camp.recipients || []).filter((r) => r.wamid);
  for (const [i, r] of recips.entries()) {
    await hook({ statuses: [{ id: r.wamid, status: 'delivered', pricing: { category: 'marketing' } }] });
    if (i < 2) await hook({ statuses: [{ id: r.wamid, status: 'read' }] });
  }
  const ts = () => String(Math.floor(Date.now() / 1000));
  await hook({ contacts: [{ wa_id: '971501112222', profile: { name: 'Ahmed Al-Mansoor' } }], messages: [{ from: '971501112222', id: 'wamid.demo.in1', timestamp: ts(), type: 'text', text: { body: 'Hello, we need 20 MT turmeric every month.' } }] });
  await hook({ messages: [{ from: '971501112222', id: 'wamid.demo.in2', timestamp: ts(), type: 'text', text: { body: 'What is the price CIF Jebel Ali?' } }] });
  await hook({ contacts: [{ wa_id: '31205554321', profile: { name: 'Lars Janssen' } }], messages: [{ from: '31205554321', id: 'wamid.demo.in3', timestamp: ts(), type: 'text', text: { body: 'Send price' } }] });
}

async function seedAiCalls(call, owner, ownerId, mode) {
  await switchOn(call, ownerId, 'ai_calling');
  if (mode !== 'full') return;
  await call('/ai-calls/settings', 'PUT', { api_key: 'sk_demo_key', agent_id: 'agent_demo_nova' }, owner);
  await call('/ai-calls/settings/options', 'PUT', { default_number_id: 'pn_vobiz', country_numbers: [{ prefix: '1', number_id: 'pn_twilio' }], window: { from_hour: 0, to_hour: 24, days: [0, 1, 2, 3, 4, 5, 6] }, max_attempts: 1, retry_hours: 4, concurrency: 3, rates: { currency: 'USD', ai_per_min: 0.09, phone_default_per_min: 0.15, countries: [{ prefix: '91', name: 'India', per_min: 0.01 }] } }, owner);
  await call('/ai-calls/settings/script', 'PUT', { company_intro: 'Nova Agro Exports, an Indian exporter of turmeric, maize and DDGS.', product_info: 'Turmeric finger, curcumin 3%+, 25 kg PP bags, 20 MT per container. Price on request.', goal: 'Find out if they buy turmeric, the monthly quantity and the email for our price list.', language: 'en', first_message: 'Hello {{buyer_name}}, this is the AI assistant of Nova Agro Exports. Do you have one minute?' }, owner);
  const c = await call('/ai-calls/campaigns', 'POST', { name: 'Turmeric buyers – round 1', audience: { mode: 'tags', tags: ['turmeric-buyer'] } }, owner);
  // The local scheduler (AI_CALL_TICK_MS=3000) places the calls; the fake ElevenLabs finishes each one after 4 s
  for (let i = 0; i < 45; i++) {
    const s = (await call(`/ai-calls/campaigns/${c.id}`, 'GET', null, owner)).stats || {};
    if (s.total && s.interested + s.not_interested + s.no_answer + s.callback >= s.total) break;
    await sleep(1000);
  }
}
