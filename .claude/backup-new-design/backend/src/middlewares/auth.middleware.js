const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { store } = require('../db/store');
const { forCompany } = require('../db/tenant');
const { APP_AUDIENCE, PLATFORM_AUDIENCE, verifyToken, publicUser } = require('../services/auth');
const { resolvePermissions, isOwner } = require('../services/permissions');

const readBearer = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

/**
 * Authenticates a company user. The user and company are re-read on every request, so
 * deactivating a staff member, changing a password or suspending a company takes effect
 * immediately instead of when the token expires.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) return ApiResponse.error(res, 'Please sign in to continue.', 401);

  let payload;
  try {
    payload = verifyToken(token, APP_AUDIENCE);
  } catch (err) {
    return ApiResponse.error(res, 'Your session has expired. Please sign in again.', 401);
  }

  const user = await store.findOne('users', { id: payload.sub, company_id: payload.cid });
  if (!user || !user.is_active || (user.token_version || 0) !== payload.tv) {
    return ApiResponse.error(res, 'Your session has ended. Please sign in again.', 401);
  }

  const company = await store.findOne('companies', { id: user.company_id });
  if (!company) return ApiResponse.error(res, 'Your session has ended. Please sign in again.', 401);
  if (company.status === 'suspended') {
    return ApiResponse.error(res, 'This workspace has been suspended. Please contact support.', 403);
  }

  req.user = publicUser(user);
  req.company = company;
  req.perms = resolvePermissions(user);
  req.db = forCompany(user.company_id);
  return next();
});

/** Only the company owner. */
const requireOwner = (req, res, next) => {
  if (!isOwner(req.user)) {
    return ApiResponse.error(res, 'Only the company owner can do this.', 403);
  }
  return next();
};

/** A boolean permission from services/permissions (owner always passes). */
const requirePermission = (key, message) => (req, res, next) => {
  if (!req.perms || req.perms[key] !== true) {
    return ApiResponse.error(res, message || 'You do not have permission to do this.', 403);
  }
  return next();
};

/** Platform operator (super admin console). Separate token audience: company tokens are rejected. */
const authenticatePlatform = (req, res, next) => {
  const token = readBearer(req);
  if (!token) return ApiResponse.error(res, 'Administrator sign-in required.', 401);
  try {
    const payload = verifyToken(token, PLATFORM_AUDIENCE);
    req.platformAdmin = { id: payload.sub };
    return next();
  } catch (err) {
    return ApiResponse.error(res, 'Administrator session expired. Please sign in again.', 401);
  }
};

module.exports = {
  authenticate,
  requireOwner,
  requirePermission,
  authenticatePlatform,
};
