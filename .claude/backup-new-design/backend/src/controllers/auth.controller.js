const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const { store } = require('../db/store');
const { nowIso } = require('../db/tenant');
const { HttpError, text, email: emailField, password: passwordField, compact } = require('../utils/validate');
const { createCompanyWithOwner, hashPassword } = require('../services/companies');
const { signUserToken, signPlatformToken, publicUser, publicCompany } = require('../services/auth');

const INVALID_LOGIN = 'Invalid email or password.';

// Compared against when the email is unknown, so response time doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const sessionPayload = (user, company) => ({
  user: publicUser(user),
  company: publicCompany(company),
  token: signUserToken(user),
});

/** POST /auth/register — creates a brand-new, empty company and its owner. */
const register = async (req, res) => {
  const companyName = text(req.body.company_name, { field: 'Company name', max: 120, required: true });
  const name = text(req.body.name, { field: 'Your name', max: 80, required: true });
  const email = emailField(req.body.email, { required: true });
  const password = passwordField(req.body.password);
  const phone = text(req.body.phone, { field: 'Phone', max: 30 }) || '';

  if (await store.findOne('users', { email })) {
    throw new HttpError(409, 'An account with this email already exists. Please sign in instead.');
  }

  let created;
  try {
    created = await createCompanyWithOwner({ companyName, ownerName: name, email, password, phone });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, 'An account with this email already exists. Please sign in instead.');
    throw err;
  }

  return ApiResponse.created(res, sessionPayload(created.owner, created.company), 'Workspace created');
};

/** POST /auth/login */
const login = async (req, res) => {
  const email = emailField(req.body.email, { required: true });
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const user = await store.findOne('users', { email });
  const ok = await bcrypt.compare(password, user?.password || DUMMY_HASH);
  if (!user || !user.password || !ok) throw new HttpError(401, INVALID_LOGIN);

  if (!user.is_active) throw new HttpError(403, 'Your account has been deactivated. Please contact your company owner.');

  const company = await store.findOne('companies', { id: user.company_id });
  if (!company) throw new HttpError(401, INVALID_LOGIN);
  if (company.status === 'suspended') throw new HttpError(403, 'This workspace has been suspended. Please contact support.');

  const lastLogin = nowIso();
  await store.updateOne('users', { id: user.id }, { last_login: lastLogin });
  user.last_login = lastLogin;

  return ApiResponse.success(res, sessionPayload(user, company), 'Signed in');
};

/** GET /auth/me */
const getProfile = async (req, res) => {
  return ApiResponse.success(res, { user: req.user, company: publicCompany(req.company) });
};

/** PATCH /auth/profile — own name/phone/avatar, and password (current password always required). */
const updateProfile = async (req, res) => {
  const set = compact({
    name: text(req.body.name, { field: 'Name', max: 80 }),
    phone: text(req.body.phone, { field: 'Phone', max: 30 }),
    avatar_url: text(req.body.avatar_url, { field: 'Avatar URL', max: 500 }),
  });
  if (set.name === '') throw new HttpError(400, 'Name cannot be empty');

  const stored = await store.findOne('users', { id: req.user.id });
  let passwordChanged = false;

  if (req.body.new_password !== undefined) {
    const next = passwordField(req.body.new_password, { field: 'New password' });
    const current = typeof req.body.current_password === 'string' ? req.body.current_password : '';
    if (!(await bcrypt.compare(current, stored.password || DUMMY_HASH))) {
      throw new HttpError(400, 'Current password is incorrect.');
    }
    set.password = await hashPassword(next);
    // Signs out every other device that still holds an old token
    set.token_version = (stored.token_version || 0) + 1;
    passwordChanged = true;
  }

  set.updated_at = nowIso();
  const updated = await store.updateOne('users', { id: req.user.id }, set);
  const payload = { user: publicUser(updated) };
  if (passwordChanged) payload.token = signUserToken(updated);
  return ApiResponse.success(res, payload, passwordChanged ? 'Password changed' : 'Profile updated');
};

/** POST /auth/logout-all — ends every session of this user. */
const logoutAll = async (req, res) => {
  const stored = await store.findOne('users', { id: req.user.id });
  await store.updateOne('users', { id: req.user.id }, { token_version: (stored.token_version || 0) + 1 });
  return ApiResponse.success(res, null, 'Signed out on all devices');
};

const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

/** POST /auth/admin-login — platform console. Disabled unless ADMIN_PASSWORD is configured. */
const adminLogin = async (req, res) => {
  if (!config.adminPassword) {
    throw new HttpError(503, 'Administrator login is not configured on this server.');
  }
  const username = String(req.body.username || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const userOk =
    safeEqual(username, config.adminUsername.toLowerCase()) || safeEqual(username, config.adminEmail.toLowerCase());
  const passOk = safeEqual(password, config.adminPassword);
  if (!userOk || !passOk) throw new HttpError(401, 'Invalid administrator credentials.');

  return ApiResponse.success(
    res,
    {
      user: { id: 'platform_admin', name: 'Platform Administrator', email: config.adminEmail, role: 'platform_admin' },
      token: signPlatformToken(),
    },
    'Administrator signed in'
  );
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  logoutAll,
  adminLogin,
};
