const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

/** General API limit per client IP (app.js sets `trust proxy` so this is the real client IP). */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => ApiResponse.error(res, 'Too many requests. Please wait a few minutes and try again.', 429),
});

/** Sign-in / sign-up attempts, counted per IP and email so one person can't lock out everyone. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || req.body?.username || '').toLowerCase()}`,
  handler: (req, res) => ApiResponse.error(res, 'Too many attempts. Please wait 15 minutes and try again.', 429),
});

module.exports = { apiLimiter, authLimiter };
