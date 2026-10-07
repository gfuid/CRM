const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

const notFoundHandler = (req, res) => ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);

/**
 * Expected errors (HttpError, bad JSON, payload too large) return their own message.
 * Anything else is logged and returns a generic 500 without internals.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Something went wrong';

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request is too large';
  }

  if (statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl}`, err);
    message = 'Something went wrong on our side. Please try again.';
  }

  const payload = { success: false, message };
  if (err.errors && statusCode < 500) payload.errors = err.errors;
  if (config.nodeEnv === 'development' && statusCode >= 500) payload.stack = err.stack;
  return res.status(statusCode).json(payload);
};

module.exports = { notFoundHandler, errorHandler };
