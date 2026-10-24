const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { responseTimeMiddleware } = require('./middlewares/responseTime.middleware');
const ApiResponse = require('./utils/apiResponse');

const app = express();

// Render / Vercel put a proxy in front of us: use the real client IP for rate limiting
app.set('trust proxy', 1);

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Compression middleware (Gzip / Brotli) for maximum throughput
app.use(
  compression({
    level: 6, // optimal CPU vs compression balance
    threshold: 1024, // only compress responses > 1KB
  })
);

// High-precision latency tracking
app.use(responseTimeMiddleware);

// CORS configuration - dynamic origin reflection to support credentials
// Only our own web apps may call the API from a browser.
// Add more domains with CORS_ORIGIN as a comma-separated list (e.g. "https://crm.mycompany.com").
// A value of "*" is ignored on purpose: allowing every website is not safe with logged-in users.
const DEFAULT_ORIGINS = [
  'https://crm-amber-nine.vercel.app',
  'https://crm-b2g7.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];
const configuredOrigins = String(config.corsOrigin || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
const allowedOrigins = new Set([...DEFAULT_ORIGINS, ...configuredOrigins.filter((o) => o !== '*')]);
const isAllowedOrigin = (origin) =>
  !origin || // server-to-server, curl, mobile apps
  allowedOrigins.has(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-email', 'x-dev-bypass'],
    credentials: true,
  })
);

// Request body parsers with payload size limits to avoid memory bloat
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (dev mode)
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Global API rate limiting
app.use('/api', apiLimiter);

// System root healthcheck
app.get('/health', (req, res) => {
  const { isDbConnected } = require('./config/db');
  return ApiResponse.success(
    res,
    {
      status: 'UP',
      uptime: `${Math.floor(process.uptime())}s`,
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: isDbConnected() ? 'MongoDB Atlas (Connected)' : 'In-Memory (Awaiting Atlas IP Whitelist)',
    },
    'CRM Backend Service is running optimally'
  );
});

// Mount API v1 routes
app.use('/api/v1', apiRoutes);

// 404 & Centralized Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
