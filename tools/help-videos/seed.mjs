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
export async function seedDemoCompany(api, { oneStaff = false } = {}) {
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
  const created = [];
  for (const l of leads) {
    const row = await call('/leads', 'POST', {
      name: l.name, company_name: l.name, country: l.country, city: l.city || '', state: l.state || '', pincode: l.pincode || '',
      products: l.products, quantity: l.quantity, quantity_unit: 'MT', price: l.price, value: l.price, stage: l.stage, source: l.source,
      ...(l.assigned_to ? { assigned_to: l.assigned_to } : {}),
      contacts: [{ name: l.contact, phone: l.phone, email: '', designation: 'Purchase Manager' }], contact_person: l.contact, phone: l.phone, whatsapp: l.phone,
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

  return { owner, staff: priyaLogin.token, priyaId: priya.id, arjunId: arjun.id, leads: created };
}
