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
 * Stricter Limiter for Auth endpoints (Login / Register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'Too many authentication attempts. Please try again in 15 minutes',
      429
    );
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
