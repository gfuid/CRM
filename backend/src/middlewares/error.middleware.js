const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

/**
 * 404 Route Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  return ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

/**
 * Centralized Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode !== 200 && res.statusCode !== 201 ? res.statusCode : 500);
  const message = err.message || 'Internal Server Error';

  // Log in development or error reporting
  if (config.nodeEnv !== 'test') {
    console.error(`[Error] [${req.method} ${req.originalUrl}]`, err);
  }

  const payload = {
    success: false,
    message,
  };

  if (err.errors) {
    payload.errors = err.errors;
  }

  // Include stack trace only in development
  if (config.nodeEnv === 'development') {
    payload.stack = err.stack;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
