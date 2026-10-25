const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

/**
 * Standard API Rate Limiter to guard against brute-force and DDoS
 */
const jwt = require('jsonwebtoken');

/** The signed-in user's id when the token is genuine, otherwise null. */
const userIdFrom = (req) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), config.jwtSecret).id || null; } catch { return null; }
};

const apiLimiter = rateLimit({
  // Counted per signed-in user, so several staff in one office (same internet) do not block each other.
  windowMs: config.rateLimit.windowMs,
  max: (req) => (userIdFrom(req) ? config.rateLimit.max * 3 : config.rateLimit.max),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = userIdFrom(req);
    return uid ? `u:${uid}` : `ip:${req.ip}`;
  },
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'Too many requests in a short time. Please wait a few minutes and try again.',
      429
    );
  },
});

/** Overall cap for one network, whoever is signed in (stops scripts using many accounts). */
const apiIpLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max * 12,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => ApiResponse.error(res, 'Too many requests from this network. Please try again in a few minutes.', 429),
});

/**
 * Login / register limiter.
 * Counted per IP + email, so a whole office on one internet connection is not locked out
 * by each other's logins, while one account still cannot be brute-forced.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 failed attempts per account per IP
  skipSuccessfulRequests: true, // a correct login never counts against the user
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
  apiIpLimiter,
  authLimiter,
  authIpLimiter,
};
