/**
 * Team management — company owner only. Employees are never self-registered: the owner
 * creates them here, inside the seats the company has (2 free + paid seats).
 */
const ApiResponse = require('../utils/apiResponse');
const { store } = require('../db/store');
const { newId, nowIso } = require('../db/tenant');
const { HttpError, text, email: emailField, password: passwordField, oneOf, compact } = require('../utils/validate');
const { sanitizePermissionOverrides, normalizeRole, ROLE_DEFAULTS, PERMISSION_SPEC } = require('../services/permissions');
const { publicUser } = require('../services/auth');
const { hashPassword, avatarFor } = require('../services/companies');
const { companyBilling } = require('../services/billing');
const { audit } = require('../services/audit');

const STAFF_ROLES = ['manager', 'agent'];

const loadStaff = async (req, id) => {
  const user = await req.db.findOne('users', { id });
  if (!user) throw new HttpError(404, 'Team member not found');
  if (normalizeRole(user.role) === 'owner') throw new HttpError(400, 'The owner account cannot be changed here');
  return user;
};

const seatError = (billing) =>
  new HttpError(
    402,
    billing.subscription_status === 'expired'
      ? `Your subscription has ended, so only ${billing.seats_free} free employees are allowed. Renew to add more.`
      : `All ${billing.seat_limit} employee seats are in use. Ask your account manager to add more seats.`,
    { billing }
  );

/** GET /team — everyone in the company plus seat usage. */
const listTeam = async (req, res) => {
  const [users, billing, leadCounts] = await Promise.all([
    req.db.find('users', {}, { sort: { created_at: 1 } }),
    companyBilling(req.company),
    req.db.find('leads', { deleted_at: null }),
  ]);
  const openByUser = new Map();
  for (const l of leadCounts) {
    if (l.stage === 'Closed Won' || l.stage === 'Closed Lost') continue;
    openByUser.set(l.assigned_to, (openByUser.get(l.assigned_to) || 0) + 1);
  }
  return ApiResponse.success(res, {
    members: users.map((u) => ({ ...publicUser(u), open_leads: openByUser.get(u.id) || 0 })),
    billing,
    role_defaults: { manager: ROLE_DEFAULTS.manager, agent: ROLE_DEFAULTS.agent },
    permission_spec: PERMISSION_SPEC,
  });
};

/** POST /team — create an employee with an initial password the owner shares with them. */
const createMember = async (req, res) => {
  const name = text(req.body.name, { field: 'Name', max: 80, required: true });
  const email = emailField(req.body.email, { required: true });
  const password = passwordField(req.body.password, { field: 'Initial password' });
  const role = oneOf(req.body.role, STAFF_ROLES, { field: 'Role' }) || 'agent';

  const billing = await companyBilling(req.company);
  if (billing.staff_used >= billing.seat_limit) throw seatError(billing);
  if (await store.findOne('users', { email })) throw new HttpError(409, 'Someone already uses this email address');

  const now = nowIso();
  const user = {
    id: newId('usr'),
    name,
    email,
    password: await hashPassword(password),
    role,
    phone: text(req.body.phone, { field: 'Phone', max: 30 }) || '',
    designation: text(req.body.designation, { field: 'Designation', max: 80 }) || '',
    department: text(req.body.department, { field: 'Department', max: 80 }) || 'Sales',
    is_active: true,
    avatar_url: avatarFor(name),
    permissions: sanitizePermissionOverrides(req.body.permissions),
    token_version: 0,
    last_login: null,
    created_by: req.user.id,
    created_at: now,
    updated_at: now,
  };
  try {
    await req.db.insert('users', user);
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, 'Someone already uses this email address');
    throw err;
  }
  await audit(req, 'STAFF_CREATED', `Added ${name} (${email}) as ${role}`, { target_user_id: user.id });
  return ApiResponse.created(res, publicUser(user), `${name} can now sign in`);
};

/** PATCH /team/:id — details, role, permissions. */
const updateMember = async (req, res) => {
  const user = await loadStaff(req, req.params.id);
  const set = compact({
    name: text(req.body.name, { field: 'Name', max: 80 }),
    phone: text(req.body.phone, { field: 'Phone', max: 30 }),
    designation: text(req.body.designation, { field: 'Designation', max: 80 }),
    department: text(req.body.department, { field: 'Department', max: 80 }),
    role: oneOf(req.body.role, STAFF_ROLES, { field: 'Role' }),
  });
  if (set.name === '') throw new HttpError(400, 'Name cannot be empty');

  if (req.body.email !== undefined) {
    const email = emailField(req.body.email, { required: true });
    if (email !== user.email) {
      if (await store.findOne('users', { email })) throw new HttpError(409, 'Someone already uses this email address');
      set.email = email;
    }
  }
  if (req.body.permissions !== undefined) {
    set.permissions = sanitizePermissionOverrides(req.body.permissions);
  }

  const changes = [];
  if (set.role && set.role !== user.role) changes.push(`role ${user.role} → ${set.role}`);
  if (set.permissions) changes.push('permissions');
  if (set.email) changes.push('email');

  set.updated_at = nowIso();
  const updated = await req.db.update('users', { id: user.id }, set);
  if (changes.length) {
    await audit(req, 'STAFF_UPDATED', `Changed ${changes.join(', ')} for ${updated.name}`, { target_user_id: user.id });
  }
  return ApiResponse.success(res, publicUser(updated), 'Saved');
};

/**
 * POST /team/:id/deactivate — signs them out everywhere immediately.
 * With { transfer_to }, their open leads and tasks move to that person.
 */
const deactivateMember = async (req, res) => {
  const user = await loadStaff(req, req.params.id);
  let transferred = { leads: 0, tasks: 0 };

  if (req.body.transfer_to) {
    const target = await req.db.findOne('users', { id: req.body.transfer_to });
    if (!target || !target.is_active || target.id === user.id) throw new HttpError(400, 'Choose an active team member to hand over to');
    const leads = await req.db.updateMany('leads', { assigned_to: user.id, deleted_at: null }, { assigned_to: target.id, updated_at: nowIso() });
    const tasks = await req.db.updateMany('tasks', { assigned_to: user.id, status: { $ne: 'Completed' } }, { assigned_to: target.id, updated_at: nowIso() });
    transferred = { leads, tasks, to: target.name };
  }

  const updated = await req.db.update('users', { id: user.id }, {
    is_active: false,
    token_version: (user.token_version || 0) + 1,
    deactivated_at: nowIso(),
    updated_at: nowIso(),
  });
  await audit(
    req,
    'STAFF_DEACTIVATED',
    `Deactivated ${user.name}${transferred.to ? `; moved ${transferred.leads} leads and ${transferred.tasks} tasks to ${transferred.to}` : ''}`,
    { target_user_id: user.id }
  );
  return ApiResponse.success(res, { member: publicUser(updated), transferred }, `${user.name} can no longer sign in`);
};

/** POST /team/:id/activate — uses a seat again. */
const activateMember = async (req, res) => {
  const user = await loadStaff(req, req.params.id);
  if (user.is_active) return ApiResponse.success(res, publicUser(user), 'Already active');
  const billing = await companyBilling(req.company);
  if (billing.staff_used >= billing.seat_limit) throw seatError(billing);
  const updated = await req.db.update('users', { id: user.id }, { is_active: true, deactivated_at: null, updated_at: nowIso() });
  await audit(req, 'STAFF_ACTIVATED', `Reactivated ${user.name}`, { target_user_id: user.id });
  return ApiResponse.success(res, publicUser(updated), `${user.name} can sign in again`);
};

/** POST /team/:id/reset-password — owner sets a new password; old sessions end. */
const resetMemberPassword = async (req, res) => {
  const user = await loadStaff(req, req.params.id);
  const password = passwordField(req.body.password, { field: 'New password' });
  await req.db.update('users', { id: user.id }, {
    password: await hashPassword(password),
    token_version: (user.token_version || 0) + 1,
    updated_at: nowIso(),
  });
  await audit(req, 'STAFF_PASSWORD_RESET', `Reset password for ${user.name}`, { target_user_id: user.id });
  return ApiResponse.success(res, null, `Password updated for ${user.name}`);
};

/** GET /team/audit-log — owner only. */
const getAuditLog = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const rows = await req.db.find('auditLogs', {}, { sort: { timestamp: -1 }, limit });
  return ApiResponse.success(res, rows);
};

module.exports = {
  listTeam,
  createMember,
  updateMember,
  deactivateMember,
  activateMember,
  resetMemberPassword,
  getAuditLog,
};
