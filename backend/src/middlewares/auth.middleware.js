const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const { dataStore } = require('../repositories/dataStore');
const models = require('../models');

/**
 * Authenticates requests via JWT Bearer Token or x-user-id header
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Check fallback x-user-id header (useful for admin dashboard & dev sync)
    const testUserId = req.headers['x-user-id'];
    if (testUserId) {
      let foundUser = null;
      try {
        if (models.User) {
          foundUser = await models.User.findOne({ id: testUserId }).lean();
        }
      } catch (e) {}

      if (!foundUser) {
        foundUser = dataStore.users.find((u) => u.id === testUserId);
      }

      if (foundUser) {
        delete foundUser.password;
        req.user = foundUser;
        return next();
      }
    }

    // Default to admin user in dev if neither token nor header is provided (for smooth testing)
    if (config.nodeEnv === 'development') {
      const defaultUser = { ...dataStore.users[0] };
      delete defaultUser.password;
      req.user = defaultUser;
      return next();
    }

    return ApiResponse.error(res, 'Authentication required. Missing Bearer token.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    let user = null;
    try {
      if (models.User) {
        user = await models.User.findOne({ id: decoded.id }).lean();
      }
    } catch (e) {}

    if (!user) {
      user = dataStore.users.find((u) => u.id === decoded.id);
    }

    if (!user) {
      return ApiResponse.error(res, 'User account no longer exists.', 401);
    }

    if (!user.is_active) {
      return ApiResponse.error(res, 'Your account has been deactivated. Please contact support.', 403);
    }

    const cleanUser = { ...user };
    delete cleanUser.password;
    req.user = cleanUser;
    next();
  } catch (err) {
    return ApiResponse.error(res, 'Invalid or expired session token. Please log in again.', 401);
  }
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

    // Admin has superuser access to all routes
    if (req.user.role === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Access denied: Role '${req.user.role}' lacks permission for this action. Required: [${allowedRoles.join(', ')}]`,
        403
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
