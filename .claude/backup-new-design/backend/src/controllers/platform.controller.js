/**
 * Platform admin console: every company/owner, their employees and seats, subscriptions,
 * payments and announcements. The platform admin never sees a company's leads.
 */
const ApiResponse = require('../utils/apiResponse');
const { store } = require('../db/store');
const { newId, nowIso } = require('../db/tenant');
const { HttpError, text, number, oneOf, compact, dateOnly } = require('../utils/validate');
const { normalizeRole } = require('../services/permissions');
const { getPlatformSettings, savePlatformSettings, billingSummary } = require('../services/billing');

const summarizeCompanies = async () => {
  const [companies, users, leads, platform] = await Promise.all([
    store.find('companies', {}, { sort: { created_at: -1 } }),
    store.find('users', {}),
    store.find('leads', { deleted_at: null }),
    getPlatformSettings(),
  ]);
  const usersByCompany = new Map();
  for (const u of users) {
    if (!usersByCompany.has(u.company_id)) usersByCompany.set(u.company_id, []);
    usersByCompany.get(u.company_id).push(u);
  }
  const leadsByCompany = new Map();
  for (const l of leads) leadsByCompany.set(l.company_id, (leadsByCompany.get(l.company_id) || 0) + 1);

  return companies.map((c) => {
    const members = usersByCompany.get(c.id) || [];
    const owner = members.find((u) => normalizeRole(u.role) === 'owner');
    const staff = members.filter((u) => normalizeRole(u.role) !== 'owner');
    const activeStaff = staff.filter((u) => u.is_active);
    const lastLogin = members.map((u) => u.last_login).filter(Boolean).sort().pop() || null;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      is_demo: !!c.is_demo,
      created_at: c.created_at,
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email, phone: owner.phone, last_login: owner.last_login } : null,
      employees_total: staff.length,
      employees_active: activeStaff.length,
      leads: leadsByCompany.get(c.id) || 0,
      last_active: lastLogin,
      billing: billingSummary(c, platform, activeStaff.length),
    };
  });
};

/** GET /platform/overview */
const getOverview = async (req, res) => {
  const companies = await summarizeCompanies();
  const real = companies.filter((c) => !c.is_demo);
  const platform = await getPlatformSettings();
  const count = (status) => real.filter((c) => c.billing.subscription_status === status).length;
  return ApiResponse.success(res, {
    companies: real.length,
    owners: real.filter((c) => c.owner).length,
    employees_active: real.reduce((s, c) => s + c.employees_active, 0),
    employees_total: real.reduce((s, c) => s + c.employees_total, 0),
    paid_seats: real.reduce((s, c) => s + c.billing.seats_paid, 0),
    monthly_revenue: real
      .filter((c) => ['active', 'expiring'].includes(c.billing.subscription_status))
      .reduce((s, c) => s + c.billing.monthly_amount, 0),
    subscriptions: { free: count('free'), active: count('active'), expiring: count('expiring'), expired: count('expired') },
    suspended: real.filter((c) => c.status === 'suspended').length,
    new_this_month: real.filter((c) => (c.created_at || '').slice(0, 7) === nowIso().slice(0, 7)).length,
    over_seat_limit: real.filter((c) => c.billing.over_limit).length,
    expiring_soon: real
      .filter((c) => ['expiring', 'expired'].includes(c.billing.subscription_status))
      .sort((a, b) => (a.billing.subscription_ends_at || '').localeCompare(b.billing.subscription_ends_at || ''))
      .slice(0, 10),
    settings: platform,
  });
};

/** GET /platform/companies?search=&status= */
const listCompanies = async (req, res) => {
  let rows = await summarizeCompanies();
  const q = String(req.query.search || '').toLowerCase().trim();
  if (q) {
    rows = rows.filter((c) =>
      [c.name, c.owner?.name, c.owner?.email, c.owner?.phone].some((v) => v && String(v).toLowerCase().includes(q))
    );
  }
  const status = req.query.status;
  if (status === 'suspended') rows = rows.filter((c) => c.status === 'suspended');
  else if (status) rows = rows.filter((c) => c.billing.subscription_status === status);
  return ApiResponse.success(res, rows);
};

/** GET /platform/companies/:id — company with its employees and payment history. */
const getCompany = async (req, res) => {
  const company = await store.findOne('companies', { id: req.params.id });
  if (!company) throw new HttpError(404, 'Company not found');
  const [summary] = (await summarizeCompanies()).filter((c) => c.id === company.id);
  const [users, payments] = await Promise.all([
    store.find('users', { company_id: company.id }, { sort: { created_at: 1 } }),
    store.find('payments', { company_id: company.id }, { sort: { created_at: -1 } }),
  ]);
  return ApiResponse.success(res, {
    ...summary,
    members: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: normalizeRole(u.role),
      designation: u.designation || '',
      is_active: u.is_active,
      last_login: u.last_login,
      created_at: u.created_at,
    })),
    payments,
  });
};

/** PATCH /platform/companies/:id — seats (absolute or +/- delta), free seats, status, subscription end. */
const updateCompany = async (req, res) => {
  const company = await store.findOne('companies', { id: req.params.id });
  if (!company) throw new HttpError(404, 'Company not found');

  const set = compact({
    seats_paid: number(req.body.seats_paid, { field: 'Paid seats', max: 10000 }),
    seats_free: number(req.body.seats_free, { field: 'Free seats', max: 1000 }),
    status: oneOf(req.body.status, ['active', 'suspended'], { field: 'Status' }),
    name: text(req.body.name, { field: 'Company name', max: 120 }),
  });
  const delta = number(req.body.seats_delta, { field: 'Seat change', min: -10000, max: 10000 });
  if (delta !== undefined) set.seats_paid = Math.max(0, (company.seats_paid || 0) + Math.trunc(delta));
  if (req.body.subscription_ends_at !== undefined) {
    const d = dateOnly(req.body.subscription_ends_at, { field: 'Subscription end date' });
    set.subscription_ends_at = d ? new Date(`${d}T23:59:59.000Z`).toISOString() : null;
  }
  if (set.seats_paid !== undefined) set.seats_paid = Math.trunc(set.seats_paid);
  if (set.seats_free !== undefined) set.seats_free = Math.trunc(set.seats_free);

  set.updated_at = nowIso();
  await store.updateOne('companies', { id: company.id }, set);
  const [summary] = (await summarizeCompanies()).filter((c) => c.id === company.id);
  return ApiResponse.success(res, summary, 'Company updated');
};

/**
 * POST /platform/companies/:id/payments — records a payment and extends the subscription
 * by `months` from today or from the current end date, whichever is later.
 */
const recordPayment = async (req, res) => {
  const company = await store.findOne('companies', { id: req.params.id });
  if (!company) throw new HttpError(404, 'Company not found');
  const months = number(req.body.months, { field: 'Months', min: 1, max: 36 }) || 1;
  const platform = await getPlatformSettings();
  const seats = company.seats_paid || 0;
  const amount = number(req.body.amount, { field: 'Amount' }) ?? seats * platform.price_per_seat_monthly * months;

  const base = Math.max(Date.now(), company.subscription_ends_at ? Date.parse(company.subscription_ends_at) : 0);
  const end = new Date(base);
  end.setUTCMonth(end.getUTCMonth() + Math.trunc(months));

  const payment = {
    id: newId('pay'),
    company_id: company.id,
    months: Math.trunc(months),
    seats,
    amount,
    currency: platform.currency,
    note: text(req.body.note, { field: 'Note', max: 300 }) || '',
    period_end: end.toISOString(),
    created_at: nowIso(),
  };
  await store.insertOne('payments', payment);
  await store.updateOne('companies', { id: company.id }, { subscription_ends_at: end.toISOString(), updated_at: nowIso() });
  await store.insertOne('notifications', {
    id: newId('ntf'),
    company_id: company.id,
    audience: 'owners',
    type: 'success',
    title: 'Subscription renewed',
    message: `Thank you! Your ${seats} paid employee seat${seats === 1 ? '' : 's'} are active until ${end.toISOString().slice(0, 10)}.`,
    created_by: 'platform',
    created_at: nowIso(),
    read_by: [],
  });
  return ApiResponse.created(res, payment, `Subscription extended to ${end.toISOString().slice(0, 10)}`);
};

/** GET /platform/notifications — sent announcements. */
const listNotifications = async (req, res) => {
  const [rows, companies] = await Promise.all([
    store.find('notifications', { created_by: 'platform' }, { sort: { created_at: -1 }, limit: 200 }),
    store.find('companies', {}),
  ]);
  const names = new Map(companies.map((c) => [c.id, c.name]));
  return ApiResponse.success(
    res,
    rows.map(({ read_by = [], ...n }) => ({ ...n, company_name: n.company_id ? names.get(n.company_id) || 'Deleted company' : 'All companies', read_count: read_by.length }))
  );
};

/** POST /platform/notifications — { company_id | null (all), audience, title, message, type } */
const sendNotification = async (req, res) => {
  const companyId = req.body.company_id || null;
  if (companyId && !(await store.findOne('companies', { id: companyId }))) throw new HttpError(404, 'Company not found');
  const notification = {
    id: newId('ntf'),
    company_id: companyId,
    audience: oneOf(req.body.audience, ['owners', 'everyone'], { field: 'Audience' }) || 'owners',
    type: oneOf(req.body.type, ['info', 'billing', 'warning', 'success'], { field: 'Type' }) || 'info',
    title: text(req.body.title, { field: 'Title', max: 120, required: true }),
    message: text(req.body.message, { field: 'Message', max: 2000, required: true }),
    created_by: 'platform',
    created_at: nowIso(),
    read_by: [],
  };
  await store.insertOne('notifications', notification);
  return ApiResponse.created(res, notification, 'Notification sent');
};

/** POST /platform/notifications/expiring — reminds every owner whose subscription ends within the reminder window. */
const remindExpiring = async (req, res) => {
  const companies = (await summarizeCompanies()).filter(
    (c) => !c.is_demo && ['expiring', 'expired'].includes(c.billing.subscription_status)
  );
  for (const c of companies) {
    const expired = c.billing.subscription_status === 'expired';
    await store.insertOne('notifications', {
      id: newId('ntf'),
      company_id: c.id,
      audience: 'owners',
      type: 'billing',
      title: expired ? 'Your subscription has ended' : `Subscription ends in ${c.billing.days_left} days`,
      message: expired
        ? `Renew your ${c.billing.seats_paid} employee seats to keep your whole team working.`
        : `Your ${c.billing.seats_paid} employee seats renew on ${(c.billing.subscription_ends_at || '').slice(0, 10)} (${c.billing.currency} ${c.billing.monthly_amount}/month).`,
      created_by: 'platform',
      created_at: nowIso(),
      read_by: [],
    });
  }
  return ApiResponse.success(res, { sent: companies.length }, `Reminded ${companies.length} owner${companies.length === 1 ? '' : 's'}`);
};

/** GET /platform/users?search= — every account across companies (no customer data). */
const listUsers = async (req, res) => {
  const [users, companies] = await Promise.all([store.find('users', {}, { sort: { created_at: -1 } }), store.find('companies', {})]);
  const names = new Map(companies.map((c) => [c.id, c.name]));
  const q = String(req.query.search || '').toLowerCase().trim();
  const rows = users
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: normalizeRole(u.role),
      is_active: u.is_active,
      company_id: u.company_id,
      company_name: names.get(u.company_id) || '—',
      last_login: u.last_login,
      created_at: u.created_at,
    }))
    .filter((u) => !q || [u.name, u.email, u.company_name].some((v) => v && v.toLowerCase().includes(q)));
  return ApiResponse.success(res, rows);
};

/**
 * PATCH /platform/users/:id — { company_id?, is_active? }. Used to place employees from the
 * old app (whose company was never recorded) into the right company.
 */
const updateUser = async (req, res) => {
  const user = await store.findOne('users', { id: req.params.id });
  if (!user) throw new HttpError(404, 'User not found');
  if (normalizeRole(user.role) === 'owner') throw new HttpError(400, 'Owners cannot be moved between companies');

  const set = { updated_at: nowIso() };
  if (req.body.company_id !== undefined && req.body.company_id !== user.company_id) {
    const target = await store.findOne('companies', { id: req.body.company_id });
    if (!target) throw new HttpError(404, 'Company not found');
    set.company_id = target.id;
    set.legacy_orphan = false;
    set.token_version = (user.token_version || 0) + 1;
  }
  if (req.body.is_active !== undefined) {
    if (typeof req.body.is_active !== 'boolean') throw new HttpError(400, 'is_active must be true or false');
    set.is_active = req.body.is_active;
    if (!req.body.is_active) set.token_version = (user.token_version || 0) + 1;
  }
  const updated = await store.updateOne('users', { id: user.id }, set);
  return ApiResponse.success(res, { id: updated.id, company_id: updated.company_id, is_active: updated.is_active }, 'User updated');
};

/** GET /platform/settings, PATCH /platform/settings */
const getSettings = async (req, res) => ApiResponse.success(res, await getPlatformSettings());

const updateSettings = async (req, res) => {
  const current = await getPlatformSettings();
  const next = {
    ...current,
    ...compact({
      price_per_seat_monthly: number(req.body.price_per_seat_monthly, { field: 'Price per employee' }),
      free_seats: number(req.body.free_seats, { field: 'Free employees', max: 1000 }),
      reminder_days_before_expiry: number(req.body.reminder_days_before_expiry, { field: 'Reminder days', min: 1, max: 60 }),
      currency: text(req.body.currency, { field: 'Currency', max: 10 }),
    }),
  };
  next.free_seats = Math.trunc(next.free_seats);
  return ApiResponse.success(res, await savePlatformSettings(next), 'Settings saved');
};

/** GET /platform/health */
const getHealth = async (req, res) => {
  const mem = process.memoryUsage();
  return ApiResponse.success(res, {
    database: store.kind === 'mongo' ? 'MongoDB' : 'In-memory (data is lost on restart)',
    uptime_seconds: Math.floor(process.uptime()),
    memory_mb: Math.round(mem.rss / 1024 / 1024),
    node: process.version,
    server_time: nowIso(),
  });
};

module.exports = {
  getOverview,
  listCompanies,
  getCompany,
  updateCompany,
  recordPayment,
  listNotifications,
  sendNotification,
  remindExpiring,
  listUsers,
  updateUser,
  getSettings,
  updateSettings,
  getHealth,
};
