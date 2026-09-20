const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const models = require('../models');

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
    if (models.User) {
      user = await models.User.findOne({ email: email.toLowerCase() });
    }
  } catch (err) {
    console.warn('DB lookup failed, falling back to cache:', err.message);
  }

  // Fallback to in-memory store
  if (!user) {
    user = dataStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  // If user not found, reject with clean error (strictly no demo fallbacks)
  if (!user) {
    return ApiResponse.error(res, 'No account found with this email. Please check your credentials or register.', 401);
  }

  // Verify active status
  if (!user.is_active) {
    return ApiResponse.error(res, 'Account is deactivated. Please contact your administrator.', 403);
  }

  // Password verification: require password and check match
  if (!password || !user.password) {
    return ApiResponse.error(res, 'Password is required.', 400);
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return ApiResponse.error(res, 'Invalid password. Please check your credentials.', 401);
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

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, persona: user.persona || 'staff' },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

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
    last_login: user.last_login,
    created_at: user.created_at,
  };

  return ApiResponse.success(res, { user: cleanUser, token }, 'Logged in successfully');
};

/**
 * Register user / company with hashed password & MongoDB storage
 */
const register = async (req, res) => {
  const { name, email, password, company_name, department, phone, persona, plan } = req.body;

  if (!email || !name) {
    return ApiResponse.error(res, 'Name and Email are required', 400);
  }

  const cleanEmail = email.toLowerCase().trim();

  // Check if exists in DB or cache
  let existing = null;
  try {
    if (models.User) {
      existing = await models.User.findOne({ email: cleanEmail });
    }
  } catch (err) {}

  if (!existing) {
    existing = dataStore.users.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  if (existing) {
    return ApiResponse.error(res, 'User with this email already exists', 409);
  }

  const isOwner = persona === 'owner' || !persona;
  const chosenPlan = plan && dataStore.plans[plan] ? plan : 'growth';

  // Hash password
  const rawPassword = password || (isOwner ? 'admin123' : 'agent123');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(rawPassword, salt);

  const newId = generateId('usr');
  const newUser = {
    id: newId,
    name: name.trim(),
    email: cleanEmail,
    password: hashedPassword,
    role: isOwner ? 'admin' : 'agent',
    persona: isOwner ? 'owner' : 'staff',
    department: department || (isOwner ? 'Executive Management' : 'Sales Outreach'),
    phone: phone || '',
    is_active: true,
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  // Persist to MongoDB Atlas
  try {
    if (models.User) {
      await models.User.create(newUser);
    }
  } catch (err) {
    console.warn('Direct MongoDB create warning:', err.message);
  }

  // Update in-memory dataStore
  dataStore.users.push(newUser);

  // If company name given, update company
  if (company_name) {
    dataStore.company.name = company_name;
  }
  if (isOwner && dataStore.plans[chosenPlan]) {
    dataStore.company.plan = chosenPlan;
    dataStore.company.maxStaff = dataStore.plans[chosenPlan].maxStaff;
  }
  dbSync.saveCompany(dataStore.company);

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role, persona: newUser.persona },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const cleanUser = { ...newUser };
  delete cleanUser.password;

  return ApiResponse.created(res, { user: cleanUser, token, company: dataStore.company }, 'Registered successfully');
};

/**
 * Get current authenticated user profile
 */
const getProfile = async (req, res) => {
  return ApiResponse.success(res, {
    user: req.user,
    company: dataStore.company,
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

  // If changing password, verify old password
  if (new_password) {
    if (user.password && current_password) {
      const match = await bcrypt.compare(current_password, user.password);
      if (!match) {
        return ApiResponse.error(res, 'Current password is incorrect', 400);
      }
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(new_password, salt);
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (department) user.department = department;
  if (avatar_url) user.avatar_url = avatar_url;

  dataStore.users[userIdx] = user;
  dbSync.saveUser(user);

  const cleanUser = { ...user };
  delete cleanUser.password;

  return ApiResponse.success(res, cleanUser, 'Profile updated successfully');
};

/**
 * Dedicated Super Admin Login with credential verification & 30-day token
 */
const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return ApiResponse.error(res, 'Admin username and password are required', 400);
  }

  const cleanUser = (username || '').toLowerCase().trim();
  const validUser = (config.adminUsername || 'traveltrade_admin').toLowerCase();
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
      username: config.adminUsername || 'traveltrade_admin',
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
        username: config.adminUsername || 'traveltrade_admin',
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
