/**
 * End-to-end API tests against the in-memory store. Run: npm test
 */
process.env.MONGODB_URI = '';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_PASSWORD = 'platform-test-pass';
process.env.DEMO_OWNER_PASSWORD = 'demo-test-pass';
process.env.RATE_LIMIT_MAX = '100000';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const app = require('../src/app');
const { bootstrap } = require('../src/db/bootstrap');
const { store } = require('../src/db/store');

let server;
let base;
let ip = 0;

// Each call gets its own client IP so the sign-in rate limiter doesn't interfere
const call = async (method, path, { token, body } = {}) => {
  ip += 1;
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': `10.0.${Math.floor(ip / 250)}.${ip % 250}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : await res.text();
  return { status: res.status, data };
};

const register = (company, email) =>
  call('POST', '/auth/register', { body: { company_name: company, name: `${company} Owner`, email, password: 'secret123' } });
const login = (email, password) => call('POST', '/auth/login', { body: { email, password } });

const ctx = {};

before(async () => {
  await bootstrap();
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;

  const a = await register('Alpha Exports', 'owner.a@test.dev');
  const b = await register('Beta Traders', 'owner.b@test.dev');
  assert.equal(a.status, 201, JSON.stringify(a.data));
  assert.equal(b.status, 201);
  ctx.ownerA = a.data.data.token;
  ctx.ownerB = b.data.data.token;
  ctx.companyA = a.data.data.company.id;
  ctx.companyB = b.data.data.company.id;
});

after(() => server.close());

test('registration validates input and rejects duplicate emails', async () => {
  assert.equal((await register('Gamma', 'owner.a@test.dev')).status, 409);
  const weak = await call('POST', '/auth/register', { body: { company_name: 'X', name: 'X', email: 'x@test.dev', password: '123' } });
  assert.equal(weak.status, 400);
  const badEmail = await call('POST', '/auth/register', { body: { company_name: 'X', name: 'X', email: { $gt: '' }, password: 'secret123' } });
  assert.equal(badEmail.status, 400);
});

test('login errors do not reveal whether an account exists', async () => {
  const wrongPass = await login('owner.a@test.dev', 'nope-nope');
  const noUser = await login('nobody@test.dev', 'nope-nope');
  assert.equal(wrongPass.status, 401);
  assert.equal(noUser.status, 401);
  assert.equal(wrongPass.data.message, noUser.data.message);
  const blank = await login('owner.a@test.dev', '');
  assert.equal(blank.status, 401);
});

test('old header backdoor no longer works', async () => {
  const res = await fetch(`${base}/api/v1/leads`, { headers: { 'x-user-id': 'usr_super_admin' } });
  assert.equal(res.status, 401);
});

test('a new company starts empty; only the demo owner sees sample data', async () => {
  const fresh = await call('GET', '/leads', { token: ctx.ownerA });
  assert.equal(fresh.status, 200);
  assert.equal(fresh.data.data.length, 0);

  const demo = await login('sagarpunia163@gmail.com', 'demo-test-pass');
  assert.equal(demo.status, 200);
  const demoLeads = await call('GET', '/leads', { token: demo.data.data.token });
  assert.ok(demoLeads.data.data.length > 200, 'demo company has sample leads');
  ctx.demoToken = demo.data.data.token;
});

test('companies cannot see or change each other\'s leads', async () => {
  const created = await call('POST', '/leads', { token: ctx.ownerA, body: { name: 'Acme Spices LLC', email: 'buy@acme.test', value: 5000 } });
  assert.equal(created.status, 201);
  ctx.leadA = created.data.data.id;

  assert.equal((await call('GET', `/leads/${ctx.leadA}`, { token: ctx.ownerB })).status, 404);
  assert.equal((await call('PATCH', `/leads/${ctx.leadA}`, { token: ctx.ownerB, body: { stage: 'Closed Won' } })).status, 404);
  assert.equal((await call('DELETE', `/leads/${ctx.leadA}`, { token: ctx.ownerB })).status, 404);
  assert.equal((await call('GET', '/leads', { token: ctx.ownerB })).data.data.length, 0);
});

test('protected lead fields cannot be overwritten', async () => {
  const res = await call('PATCH', `/leads/${ctx.leadA}`, {
    token: ctx.ownerA,
    body: { id: 'hijack', company_id: ctx.companyB, created_by_id: 'someone', deleted_at: 'x', notes: 'ok' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.data.id, ctx.leadA);
  assert.equal(res.data.data.notes, 'ok');
  const raw = await store.findOne('leads', { id: ctx.leadA });
  assert.equal(raw.company_id, ctx.companyA);
  assert.equal(raw.deleted_at, null);
});

test('lead input is validated', async () => {
  const bad = [
    { name: '   ' },
    { name: 'X', email: 'not-an-email' },
    { name: 'X', stage: 'Banana' },
    { name: 'X', value: -5 },
    { name: 'x'.repeat(500) },
    { name: { $ne: 1 } },
  ];
  for (const body of bad) {
    const res = await call('POST', '/leads', { token: ctx.ownerA, body });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

test('duplicate leads are flagged unless confirmed', async () => {
  const dup = await call('POST', '/leads', { token: ctx.ownerA, body: { name: 'ACME Spices L.L.C.' } });
  assert.equal(dup.status, 409);
  assert.equal(dup.data.errors.duplicate.id, ctx.leadA);
  const forced = await call('POST', '/leads', { token: ctx.ownerA, body: { name: 'ACME Spices L.L.C.', allow_duplicate: true } });
  assert.equal(forced.status, 201);
});

test('owner adds employees within free seats; employees cannot manage the team', async () => {
  const s1 = await call('POST', '/team', { token: ctx.ownerA, body: { name: 'Ravi', email: 'ravi@test.dev', password: 'staff123', role: 'agent' } });
  const s2 = await call('POST', '/team', { token: ctx.ownerA, body: { name: 'Meena', email: 'meena@test.dev', password: 'staff123', role: 'manager' } });
  assert.equal(s1.status, 201, JSON.stringify(s1.data));
  assert.equal(s2.status, 201);
  ctx.staffId = s1.data.data.id;
  ctx.managerId = s2.data.data.id;
  assert.equal(s1.data.data.password, undefined);

  const third = await call('POST', '/team', { token: ctx.ownerA, body: { name: 'Third', email: 'third@test.dev', password: 'staff123' } });
  assert.equal(third.status, 402, 'only 2 free seats');

  const staffLogin = await login('ravi@test.dev', 'staff123');
  assert.equal(staffLogin.status, 200);
  ctx.staff = staffLogin.data.data.token;
  ctx.manager = (await login('meena@test.dev', 'staff123')).data.data.token;

  assert.equal((await call('GET', '/team', { token: ctx.staff })).status, 403);
  assert.equal((await call('POST', '/team', { token: ctx.manager, body: { name: 'X', email: 'x2@test.dev', password: 'staff123' } })).status, 403);
  // Self-registration never creates an employee inside an existing company
  const selfReg = await call('POST', '/auth/register', { body: { company_name: 'Alpha Exports', name: 'Sneaky', email: 'sneaky@test.dev', password: 'secret123', persona: 'staff' } });
  assert.notEqual(selfReg.data.data.company.id, ctx.companyA);
});

test('sales staff see only their own leads and cannot delete, export or reassign', async () => {
  assert.equal((await call('GET', '/leads', { token: ctx.staff })).data.data.length, 0);
  assert.equal((await call('GET', `/leads/${ctx.leadA}`, { token: ctx.staff })).status, 404);

  const mine = await call('POST', '/leads', { token: ctx.staff, body: { name: 'Staff Buyer Co' } });
  assert.equal(mine.status, 201);
  assert.equal(mine.data.data.assigned_to, ctx.staffId);
  ctx.staffLead = mine.data.data.id;

  assert.equal((await call('DELETE', `/leads/${ctx.staffLead}`, { token: ctx.staff })).status, 403);
  assert.equal((await call('GET', '/leads/export', { token: ctx.staff })).status, 403);
  assert.equal((await call('PATCH', `/leads/${ctx.staffLead}`, { token: ctx.staff, body: { assigned_to: ctx.managerId } })).status, 403);
  assert.equal((await call('GET', '/leads/trash', { token: ctx.staff })).status, 403);

  // Manager sees everything in the company
  assert.equal((await call('GET', '/leads', { token: ctx.manager })).data.data.length, 3);
});

test('owner can grant an employee extra permissions', async () => {
  const res = await call('PATCH', `/team/${ctx.staffId}`, { token: ctx.ownerA, body: { permissions: { leads_export: true, bogus: true, leads_scope: 'everything' } } });
  assert.equal(res.status, 200);
  assert.equal(res.data.data.permissions.leads_export, true);
  assert.equal(res.data.data.permissions.leads_scope, 'own');
  const csv = await call('GET', '/leads/export', { token: ctx.staff });
  assert.equal(csv.status, 200);
  assert.ok(csv.data.includes('Staff Buyer Co'));
  assert.ok(!csv.data.includes('Acme Spices'), 'export only includes leads the employee can see');
});

test('logging an activity feeds follow-ups, daily report and outreach', async () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const log = await call('POST', `/leads/${ctx.staffLead}/activities`, {
    token: ctx.staff,
    body: { type: 'call_initiated', note: 'Discussed price', next_follow_up_date: yesterday, stage: 'Contact Established' },
  });
  assert.equal(log.status, 201);
  assert.equal(log.data.data.lead.follow_up_date, yesterday);
  assert.equal(log.data.data.lead.stage, 'Contact Established');

  const today = await call('GET', '/reports/today', { token: ctx.staff });
  assert.equal(today.data.data.follow_ups.overdue[0].id, ctx.staffLead);

  const daily = await call('GET', '/reports/daily', { token: ctx.ownerA });
  assert.ok(daily.data.data.some((r) => r.user_name === 'Ravi' && r.status_changes === 1));

  const outreach = await call('GET', '/reports/outreach', { token: ctx.ownerA });
  assert.equal(outreach.data.data.totals.call_initiated, 1);

  // Staff without team_reports only see their own activity
  const feed = await call('GET', '/activity', { token: ctx.staff });
  assert.ok(feed.data.data.every((a) => a.user_name === 'Ravi'));
});

test('analytics: staff get their own numbers, owner gets the company', async () => {
  const own = await call('GET', '/analytics', { token: ctx.staff });
  assert.equal(own.data.data.scope, 'own');
  assert.equal(own.data.data.kpis.total_leads, 1);
  const company = await call('GET', '/analytics', { token: ctx.ownerA });
  assert.equal(company.data.data.scope, 'company');
  assert.equal(company.data.data.kpis.total_leads, 3);
});

test('deleted leads go to the trash and the owner can restore them', async () => {
  assert.equal((await call('DELETE', `/leads/${ctx.leadA}`, { token: ctx.ownerA })).status, 200);
  assert.equal((await call('GET', `/leads/${ctx.leadA}`, { token: ctx.ownerA })).status, 404);
  const trash = await call('GET', '/leads/trash', { token: ctx.ownerA });
  assert.equal(trash.data.data[0].id, ctx.leadA);
  assert.equal((await call('POST', `/leads/${ctx.leadA}/restore`, { token: ctx.ownerA })).status, 200);
  assert.equal((await call('GET', `/leads/${ctx.leadA}`, { token: ctx.ownerA })).status, 200);
});

test('deactivating an employee ends their session and hands over their leads', async () => {
  const res = await call('POST', `/team/${ctx.staffId}/deactivate`, { token: ctx.ownerA, body: { transfer_to: ctx.managerId } });
  assert.equal(res.status, 200);
  assert.equal(res.data.data.transferred.leads, 1);
  assert.equal((await call('GET', '/leads', { token: ctx.staff })).status, 401);
  assert.equal((await login('ravi@test.dev', 'staff123')).status, 403);
  const lead = await call('GET', `/leads/${ctx.staffLead}`, { token: ctx.ownerA });
  assert.equal(lead.data.data.assigned_to, ctx.managerId);
});

test('changing a password needs the current one and signs out old sessions', async () => {
  const noCurrent = await call('PATCH', '/auth/profile', { token: ctx.manager, body: { new_password: 'newpass123' } });
  assert.equal(noCurrent.status, 400);
  const ok = await call('PATCH', '/auth/profile', { token: ctx.manager, body: { current_password: 'staff123', new_password: 'newpass123' } });
  assert.equal(ok.status, 200);
  assert.equal((await call('GET', '/auth/me', { token: ctx.manager })).status, 401);
  assert.equal((await call('GET', '/auth/me', { token: ok.data.data.token })).status, 200);
});

test('tasks: staff only manage their own', async () => {
  const t = await call('POST', '/tasks', { token: ctx.ownerA, body: { title: 'Send samples', assigned_to: ctx.managerId, due_date: '2026-10-10', due_time: '17:30' } });
  assert.equal(t.status, 201);
  const bad = await call('POST', '/tasks', { token: ctx.ownerA, body: { title: 'X', due_date: 'tomorrow' } });
  assert.equal(bad.status, 400);
  assert.equal((await call('GET', '/tasks', { token: ctx.ownerB })).data.data.length, 0);
});

test('platform console is separate from company accounts', async () => {
  assert.equal((await call('GET', '/platform/overview', { token: ctx.ownerA })).status, 401);
  const wrong = await call('POST', '/auth/admin-login', { body: { username: 'traveltrade_admin', password: 'wrong' } });
  assert.equal(wrong.status, 401);
  const ok = await call('POST', '/auth/admin-login', { body: { username: 'traveltrade_admin', password: 'platform-test-pass' } });
  assert.equal(ok.status, 200);
  ctx.platform = ok.data.data.token;
  assert.equal((await call('GET', '/leads', { token: ctx.platform })).status, 401);

  const overview = await call('GET', '/platform/overview', { token: ctx.platform });
  assert.equal(overview.status, 200);
  assert.ok(overview.data.data.companies >= 3, 'demo company is excluded, real ones counted');

  const companies = await call('GET', '/platform/companies', { token: ctx.platform });
  const alpha = companies.data.data.find((c) => c.id === ctx.companyA);
  assert.equal(alpha.owner.email, 'owner.a@test.dev');
  assert.equal(alpha.employees_total, 2);
  assert.equal(alpha.employees_active, 1);
});

test('paid seats raise the employee limit only while the subscription is active', async () => {
  await call('PATCH', `/platform/companies/${ctx.companyA}`, { token: ctx.platform, body: { seats_delta: 2 } });
  let billing = (await call('GET', '/company', { token: ctx.ownerA })).data.data.billing;
  assert.equal(billing.subscription_status, 'expired', 'paid seats without payment do not count');
  assert.equal(billing.seat_limit, 2);

  const pay = await call('POST', `/platform/companies/${ctx.companyA}/payments`, { token: ctx.platform, body: { months: 1 } });
  assert.equal(pay.status, 201);
  assert.equal(pay.data.data.amount, 2 * 500);
  billing = (await call('GET', '/company', { token: ctx.ownerA })).data.data.billing;
  assert.equal(billing.subscription_status, 'active');
  assert.equal(billing.seat_limit, 4);

  const third = await call('POST', '/team', { token: ctx.ownerA, body: { name: 'Third', email: 'third@test.dev', password: 'staff123' } });
  assert.equal(third.status, 201);

  // Ending in 3 days shows as "expiring" and the owner gets a reminder
  const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  await call('PATCH', `/platform/companies/${ctx.companyA}`, { token: ctx.platform, body: { subscription_ends_at: soon } });
  const notes = await call('GET', '/notifications', { token: ctx.ownerA });
  assert.equal(notes.data.data.items[0].id, 'billing_expiring');
});

test('platform notifications reach the right owners only', async () => {
  const sent = await call('POST', '/platform/notifications', {
    token: ctx.platform,
    body: { company_id: ctx.companyB, title: 'Hello Beta', message: 'Your account manager is ready.' },
  });
  assert.equal(sent.status, 201);
  const b = await call('GET', '/notifications', { token: ctx.ownerB });
  assert.ok(b.data.data.items.some((n) => n.title === 'Hello Beta'));
  const a = await call('GET', '/notifications', { token: ctx.ownerA });
  assert.ok(!a.data.data.items.some((n) => n.title === 'Hello Beta'));

  await call('POST', '/notifications/read-all', { token: ctx.ownerB });
  const after = await call('GET', '/notifications', { token: ctx.ownerB });
  assert.equal(after.data.data.unread, 0);
});

test('suspending a company blocks its users', async () => {
  await call('PATCH', `/platform/companies/${ctx.companyB}`, { token: ctx.platform, body: { status: 'suspended' } });
  assert.equal((await call('GET', '/leads', { token: ctx.ownerB })).status, 403);
  assert.equal((await login('owner.b@test.dev', 'secret123')).status, 403);
  await call('PATCH', `/platform/companies/${ctx.companyB}`, { token: ctx.platform, body: { status: 'active' } });
  assert.equal((await call('GET', '/leads', { token: ctx.ownerB })).status, 200);
});

test('import skips duplicates and reports bad rows', async () => {
  const res = await call('POST', '/leads/import', {
    token: ctx.ownerA,
    body: { leads: [{ name: 'New Buyer One' }, { name: 'Acme Spices' }, { name: '' }, { name: 'New Buyer One' }] },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.data.created, 1);
  assert.equal(res.data.data.skipped.length, 2);
  assert.equal(res.data.data.errors.length, 1);
  const audit = await call('GET', '/team/audit-log', { token: ctx.ownerA });
  assert.ok(audit.data.data.some((l) => l.action === 'LEADS_IMPORTED'));
});
