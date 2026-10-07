const bcrypt = require('bcryptjs');
const { store } = require('../db/store');
const { newId, nowIso } = require('../db/tenant');
const { DEFAULT_SETTINGS } = require('../config/defaults');
const { getPlatformSettings } = require('./billing');

const hashPassword = (plain) => bcrypt.hash(plain, 10);

const avatarFor = (name) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

/**
 * Creates a new, empty company and its owner account.
 * `passwordHash` lets migrations carry over an existing bcrypt hash.
 */
const createCompanyWithOwner = async ({
  companyName,
  ownerName,
  email,
  password,
  passwordHash,
  phone = '',
  companyId,
  ownerId,
  isDemo = false,
}) => {
  const platform = await getPlatformSettings();
  const now = nowIso();
  const company = {
    id: companyId || newId('comp'),
    name: companyName,
    seats_free: platform.free_seats,
    seats_paid: 0,
    subscription_ends_at: null,
    status: 'active',
    is_demo: isDemo,
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    created_at: now,
    updated_at: now,
  };
  const owner = {
    id: ownerId || newId('usr'),
    company_id: company.id,
    name: ownerName,
    email,
    password: passwordHash !== undefined ? passwordHash : await hashPassword(password),
    role: 'owner',
    department: 'Management',
    designation: 'Owner',
    phone,
    is_active: true,
    avatar_url: avatarFor(ownerName),
    permissions: {},
    token_version: 0,
    last_login: null,
    created_at: now,
    updated_at: now,
  };
  company.owner_id = owner.id;

  await store.insertOne('users', owner);
  try {
    await store.insertOne('companies', company);
  } catch (err) {
    await store.deleteOne('users', { id: owner.id });
    throw err;
  }
  return { company, owner };
};

module.exports = { createCompanyWithOwner, hashPassword, avatarFor };
