const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const { dataStore } = require('../repositories/dataStore');
const { isDbConnected } = require('../config/db');
const models = require('../models');
const { isSuperAdmin, isOwnerUser } = require('../utils/access');

const DEFAULT_JWT_SECRET = 'crm_default_jwt_secret_key_change_in_prod';

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const tokenMatch = typeof authHeader === 'string' && authHeader.match(/^Bearer\s+(\S+)$/i);

  if (!tokenMatch) {
    return ApiResponse.error(res, 'Authentication required. Missing bearer token.', 401);
  }

  if (config.nodeEnv === 'production' && config.jwtSecret === DEFAULT_JWT_SECRET) {
    return ApiResponse.error(res, 'Authentication is not securely configured.', 503);
  }

  let decoded;
  try {
    decoded = jwt.verify(tokenMatch[1], config.jwtSecret);
  } catch {
    return ApiResponse.error(res, 'Invalid or expired session token. Please log in again.', 401);
  }

  if (!decoded || typeof decoded !== 'object' || typeof decoded.id !== 'string') {
    return ApiResponse.error(res, 'Invalid session token. Please log in again.', 401);
  }

  if (decoded.id === 'usr_super_admin') {
    req.user = {
      id: 'usr_super_admin',
      name: 'Super Administrator',
      email: config.adminEmail || 'admin@travel-trade.com',
      username: config.adminUsername || 'admin',
      role: 'admin',
      persona: 'owner',
      is_active: true,
    };
    return next();
  }

  let user = null;
  if (isDbConnected() && models.User) {
    try {
      user = await models.User.findOne({ id: decoded.id }).lean();
    } catch (err) {
      console.error('[Authentication] User lookup failed:', err.message);
      return ApiResponse.error(res, 'Authentication service is temporarily unavailable.', 503);
    }
  } else {
    user = dataStore.users.find((candidate) => candidate.id === decoded.id) || null;
  }

  if (!user) {
    return ApiResponse.error(res, 'User account no longer exists. Please log in again.', 401);
  }

  if (user.is_active === false) {
    return ApiResponse.error(res, 'Your account has been deactivated. Please contact support.', 403);
  }

  // Tokens issued before the last password change are no longer valid
  if (user.password_changed_at && decoded.iat) {
    const changedAt = new Date(user.password_changed_at).getTime();
    if (!Number.isNaN(changedAt) && decoded.iat * 1000 < changedAt - 1000) {
      return ApiResponse.error(res, 'Your password was changed. Please log in again.', 401);
    }
  }

  const cleanUser = { ...user };
  delete cleanUser.password;
  delete cleanUser.staff_password;
  delete cleanUser.plain_password;
  req.user = cleanUser;
  return next();
};

/**
 * Role-Based Access Control Middleware (RBAC)
 * @param  {...string} allowedRoles ('admin', 'manager', 'agent')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Unauthenticated user.', 401);
    }

    // Super Admin and Company Owners pass role checks (owners are still scoped to their own company in controllers)
    if (isSuperAdmin(req.user) || isOwnerUser(req.user)) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Access denied: Role '${req.user.role}' lacks permission for this action. Required: [${allowedRoles.join(', ')}]`,
        403
      );
    }

    return next();
  };
};

/**
 * Platform operator only. Company owners are NOT allowed here.
 */
const requireSuperAdmin = (req, res, next) => {
  if (!isSuperAdmin(req.user)) {
    return ApiResponse.error(res, 'Access denied: Super Admin only.', 403);
  }
  return next();
};

/**
 * Company owner (or Super Admin acting on behalf of one).
 */
const requireOwner = (req, res, next) => {
  if (!isSuperAdmin(req.user) && !isOwnerUser(req.user)) {
    return ApiResponse.error(res, 'Access denied: Only the company owner can do this.', 403);
  }
  return next();
};

module.exports = {
  authenticate,
  authorize,
  requireSuperAdmin,
  requireOwner,
};
