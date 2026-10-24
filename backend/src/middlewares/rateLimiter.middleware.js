const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

/**
 * Standard API Rate Limiter to guard against brute-force and DDoS
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'Too many requests from this IP, please try again after 15 minutes',
      429
    );
  },
});

/**
 * Login / register limiter.
 * Counted per IP + email, so a whole office on one internet connection is not locked out
 * by each other's logins, while one account still cannot be brute-forced.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per account per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const who = String((req.body && (req.body.email || req.body.username)) || '').toLowerCase().trim();
    return `${req.ip}|${who}`;
  },
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'Too many login attempts for this account. Please try again in 15 minutes',
      429
    );
  },
});

/**
 * Overall cap per IP on the auth endpoints (stops scripted attacks across many emails).
 */
const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => ApiResponse.error(res, 'Too many requests from this network. Please try again in 15 minutes', 429),
});

module.exports = {
  apiLimiter,
  authLimiter,
  authIpLimiter,
};
