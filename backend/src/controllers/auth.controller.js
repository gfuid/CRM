const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { isDbConnected } = require('../config/db');
const models = require('../models');
const mailer = require('../services/mailer.service');

/**
 * Login user with MongoDB lookup & bcrypt verification
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return ApiResponse.error(res, 'Email is required', 400);
  }

  // 1. Try finding in MongoDB first
  let user = null;
  try {
    if (isDbConnected() && models.User) {
      user = await models.User.findOne({ email: email.toLowerCase() });
    }
  } catch (err) {
    console.warn('DB lookup failed, falling back to cache:', err.message);
  }

  // Fallback to in-memory store
  if (!user && dataStore.users && Array.isArray(dataStore.users)) {
    user = dataStore.users.find((u) => u && u.email && u.email.toLowerCase() === email.toLowerCase());
  }

  // If user not found, reject with clean error (strictly no demo fallbacks)
  if (!user) {
    return ApiResponse.error(res, 'Invalid email or password. Please check your credentials.', 401);
  }


  // Password verification: require password and check match
  if (!password) {
    return ApiResponse.error(res, 'Password is required.', 400);
  }
  if (!user.password) {
    return ApiResponse.error(res, 'Invalid email or password. Please check your credentials.', 401);
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return ApiResponse.error(res, 'Invalid email or password. Please check your credentials.', 401);
  }

  // Verify active status (only after the password is proven, so account state is not leaked)
  if (!user.is_active) {
    return ApiResponse.error(res, 'Account is deactivated. Please contact your administrator.', 403);
  }
  // Staff of a suspended company cannot log in either
  if (user.persona === 'staff' && user.created_by) {
    const ownerRec = dataStore.users.find((o) => o.id === user.created_by || (o.email && o.email.toLowerCase() === String(user.created_by).toLowerCase()));
    if (ownerRec && ownerRec.is_active === false) {
      return ApiResponse.error(res, 'Your company account is suspended. Please contact your company owner.', 403);
    }
  }

  // Update last login
  const now = new Date().toISOString();
  user.last_login = now;
  dbSync.saveUser({ id: user.id, last_login: now });

  // Update memory cache
  const cachedIdx = dataStore.users.findIndex((u) => u.id === user.id);
  if (cachedIdx !== -1) {
    dataStore.users[cachedIdx].last_login = now;
  }

  const isOwner = user.persona === 'owner' || user.role === 'admin';
  if (isOwner && (!user.company_id || user.company_id === 'comp_1' || user.company_id === 'comp_traveltrade_1')) {
    user.company_id = 'comp_' + user.id;
    dbSync.saveUser({ id: user.id, company_id: user.company_id });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      persona: user.persona || 'staff',
      company_id: user.company_id || '',
      data_scope: user.data_scope || 'own_only',
      permissions: user.permissions || {},
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  // Resolve accurate company name for owner or staff
  let companyName = user.company_name || '';
  if (!companyName && user.persona === 'staff') {
    const owner = dataStore.users.find(
      (o) =>
        (o.persona === 'owner' || o.role === 'admin') &&
        ((user.company_id && o.company_id === user.company_id) || o.id === user.created_by || o.email === user.created_by)
    );
    if (owner && owner.company_name) {
      companyName = owner.company_name;
    }
  }
  if (!companyName && user.persona === 'owner') {
    companyName = user.company_name || (user.name ? `${user.name}'s Workspace` : 'My Organization');
  }
  if (!companyName) {
    companyName = dataStore.company?.name || 'Global Export Trade';
  }

  const cleanUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    persona: user.persona || 'staff',
    department: user.department,
    phone: user.phone || '',
    is_active: user.is_active,
    avatar_url: user.avatar_url,
    company_id: user.company_id || '',
    company_name: companyName,
    created_by: user.created_by || '',
    data_scope: user.data_scope || 'own_only',
    permissions: user.permissions || {},
    staff_limit: user.staff_limit !== undefined && user.staff_limit !== null ? Number(user.staff_limit) : 2,
    last_login: user.last_login,
    created_at: user.created_at,
  };

  const companyData = {
    id: user.company_id || 'comp_1',
    name: companyName,
    plan: user.plan || dataStore.company?.plan || 'growth',
  };

  return ApiResponse.success(res, { user: cleanUser, token, company: companyData }, 'Logged in successfully');
};

/**
 * Register user / company with hashed password & MongoDB storage
 */
const register = async (req, res) => {
  const { name, email, password, company_name, department, phone, persona, plan } = req.body;

  if (!email || !name) {
    return ApiResponse.error(res, 'Name and Email are required', 400);
  }
  if (typeof password !== 'string' || password.length < 6) {
    return ApiResponse.error(res, 'Password must be at least 6 characters long', 400);
  }
  // Public sign-up always creates a company owner. Staff accounts are created by their owner.
  if (persona && persona !== 'owner') {
    return ApiResponse.error(res, 'Staff accounts are created by your company owner. Please ask them to add you.', 403);
  }

  const cleanEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return ApiResponse.error(res, 'Email address is not valid', 400);
  }

  // Check if exists in DB or cache
  let existing = null;
  try {
    if (isDbConnected() && models.User) {
      existing = await models.User.findOne({ email: cleanEmail });
    }
  } catch (err) {}

  if (!existing) {
    existing = dataStore.users.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  if (existing) {
    return ApiResponse.error(res, 'User with this email already exists', 409);
  }

  const isOwner = true;
  const chosenPlan = plan && dataStore.plans[plan] ? plan : 'growth';

  // Hash password
  const rawPassword = password;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(rawPassword, salt);

  const newId = generateId('usr');
  const companyId = isOwner ? generateId('comp') : (req.user?.company_id || '');
  const cleanCompanyName = company_name ? company_name.trim() : (isOwner ? `${name.trim()}'s Workspace` : 'Global Export Trade');
  const newUser = {
    id: newId,
    name: name.trim(),
    email: cleanEmail,
    password: hashedPassword,
    role: isOwner ? 'admin' : 'agent',
    persona: isOwner ? 'owner' : 'staff',
    company_id: companyId,
    company_name: cleanCompanyName,
    created_by: isOwner ? '' : (req.user?.id || ''),
    staff_limit: isOwner ? 2 : undefined,
    plan: chosenPlan,
    department: department || (isOwner ? 'Executive Management' : 'Sales Outreach'),
    phone: phone || '',
    is_active: true,
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  // Persist to MongoDB Atlas
  try {
    if (isDbConnected() && models.User) {
      await models.User.create(newUser);
    }
  } catch (err) {
    console.warn('Direct MongoDB create warning:', err.message);
  }

  // Update in-memory dataStore
  dataStore.users.push(newUser);

  // Each owner keeps their own company name/plan on their user record; the global company record is not touched.

  // Thank-you / welcome email from the platform sender (non-blocking, never fails registration)
  if (isOwner) {
    mailer.sendWelcomeEmail(newUser, cleanCompanyName).catch(() => {});
  }

  const token = jwt.sign(
    {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      persona: newUser.persona,
      company_id: newUser.company_id,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const cleanUser = { ...newUser };
  delete cleanUser.password;

  const companyPayload = {
    id: companyId,
    name: cleanCompanyName,
    plan: chosenPlan,
  };

  return ApiResponse.created(res, { user: cleanUser, token, company: companyPayload }, 'Registered successfully');
};

/**
 * Get current authenticated user profile
 */
const getProfile = async (req, res) => {
  const isOwner = req.user.persona === 'owner' || req.user.role === 'admin';
  if (isOwner && (!req.user.company_id || req.user.company_id === 'comp_1' || req.user.company_id === 'comp_traveltrade_1')) {
    req.user.company_id = 'comp_' + req.user.id;
    const userInStore = dataStore.users.find((u) => u.id === req.user.id);
    if (userInStore) {
      userInStore.company_id = req.user.company_id;
      dbSync.saveUser(userInStore);
    }
  }

  let companyName = req.user.company_name || '';
  if (!companyName && req.user.persona === 'staff') {
    const owner = dataStore.users.find(
      (o) =>
        (o.persona === 'owner' || o.role === 'admin') &&
        ((req.user.company_id && o.company_id === req.user.company_id) || o.id === req.user.created_by || o.email === req.user.created_by)
    );
    if (owner && owner.company_name) {
      companyName = owner.company_name;
    }
  }
  if (!companyName && req.user.persona === 'owner') {
    companyName = req.user.company_name || (req.user.name ? `${req.user.name}'s Workspace` : 'My Organization');
  }
  if (!companyName) {
    companyName = dataStore.company?.name || 'Global Export Trade';
  }

  const userWithCompany = {
    ...req.user,
    company_name: companyName,
  };

  const resolvedCompanyId = req.user.company_id || (isOwner ? ('comp_' + req.user.id) : 'comp_1');

  // Sliding session: every app start hands back a fresh 30-day token, so active users are never logged out
  const freshToken = jwt.sign(
    {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      persona: req.user.persona || 'staff',
      company_id: req.user.company_id || '',
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return ApiResponse.success(res, {
    token: freshToken,
    user: userWithCompany,
    company: {
      id: resolvedCompanyId,
      name: companyName,
      plan: req.user.plan || dataStore.company?.plan || 'growth',
    },
  });
};

/**
 * Update authenticated user profile
 */
const updateProfile = async (req, res) => {
  const { name, phone, department, avatar_url, current_password, new_password } = req.body;
  const userId = req.user.id;

  const userIdx = dataStore.users.findIndex((u) => u.id === userId);
  if (userIdx === -1) {
    return ApiResponse.error(res, 'User not found', 404);
  }

  const user = dataStore.users[userIdx];

  // If changing password, the current password is always required
  let passwordChanged = false;
  if (new_password !== undefined && new_password !== '') {
    if (typeof new_password !== 'string' || new_password.length < 6) {
      return ApiResponse.error(res, 'New password must be at least 6 characters long', 400);
    }
    if (user.password) {
      if (!current_password) {
        return ApiResponse.error(res, 'Please enter your current password to set a new one', 400);
      }
      const match = await bcrypt.compare(current_password, user.password);
      if (!match) {
        return ApiResponse.error(res, 'Current password is incorrect', 400);
      }
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(new_password, salt);
    user.password_changed_at = new Date().toISOString();
    passwordChanged = true;
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (department) user.department = department;
  if (avatar_url) user.avatar_url = avatar_url;

  dataStore.users[userIdx] = user;
  dbSync.saveUser(user);

  const cleanUser = { ...user };
  delete cleanUser.password;

  // Old sessions stop working after a password change; hand this device a fresh token
  if (passwordChanged) {
    cleanUser.token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, persona: user.persona || 'staff', company_id: user.company_id || '' },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }

  return ApiResponse.success(res, cleanUser, passwordChanged ? 'Password changed. Other devices have been signed out.' : 'Profile updated successfully');
};

/**
 * Dedicated Super Admin Login with credential verification & 30-day token
 */
const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return ApiResponse.error(res, 'Admin username and password are required', 400);
  }

  if (
    config.nodeEnv === 'production' &&
    (config.adminPassword === 'admin123' ||
      config.jwtSecret === 'crm_default_jwt_secret_key_change_in_prod')
  ) {
    return ApiResponse.error(res, 'Administrator authentication is not securely configured.', 503);
  }

  const cleanUser = (username || '').toLowerCase().trim();
  const validUser = (config.adminUsername || 'admin').toLowerCase();
  const validEmail = (config.adminEmail || 'admin@travel-trade.com').toLowerCase();

  const isUserMatch = cleanUser === validUser || cleanUser === validEmail;
  const isPassMatch = password === config.adminPassword;

  if (!isUserMatch || !isPassMatch) {
    return ApiResponse.error(res, 'Invalid administrator credentials. Access denied.', 401);
  }

  const token = jwt.sign(
    {
      id: 'usr_super_admin',
      name: 'Super Administrator',
      email: config.adminEmail || 'admin@travel-trade.com',
      username: config.adminUsername || 'admin',
      role: 'admin',
      persona: 'owner',
    },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

  return ApiResponse.success(
    res,
    {
      user: {
        id: 'usr_super_admin',
        name: 'Super Administrator',
        email: config.adminEmail || 'admin@travel-trade.com',
        username: config.adminUsername || 'admin',
        role: 'admin',
      },
      token,
    },
    'Administrator authenticated successfully'
  );
};

module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  adminLogin,
};
