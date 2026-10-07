const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { normalizeRole, resolvePermissions } = require('./permissions');

const APP_AUDIENCE = 'crm-app';
const PLATFORM_AUDIENCE = 'crm-platform';

const signUserToken = (user) =>
  jwt.sign({ sub: user.id, cid: user.company_id, tv: user.token_version || 0 }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    audience: APP_AUDIENCE,
  });

const signPlatformToken = () =>
  jwt.sign({ sub: 'platform_admin' }, config.jwtSecret, { expiresIn: '12h', audience: PLATFORM_AUDIENCE });

const verifyToken = (token, audience) => jwt.verify(token, config.jwtSecret, { audience });

/** The user as the API exposes it: no password hash or token version, plus effective permissions. */
const publicUser = (user) => {
  if (!user) return null;
  const { password, token_version, _id, ...rest } = user;
  const role = normalizeRole(user.role);
  return {
    ...rest,
    role,
    persona: role === 'owner' ? 'owner' : 'staff',
    permission_overrides: user.permissions || {},
    permissions: resolvePermissions(user),
  };
};

const publicCompany = (company) => {
  if (!company) return null;
  const { _id, ...rest } = company;
  return rest;
};

module.exports = {
  APP_AUDIENCE,
  PLATFORM_AUDIENCE,
  signUserToken,
  signPlatformToken,
  verifyToken,
  publicUser,
  publicCompany,
};
