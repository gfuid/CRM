const dotenv = require('dotenv');
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'production';
const isProduction = nodeEnv === 'production';

const DEV_JWT_SECRET = 'local-dev-only-jwt-secret';

const config = {
  port: process.env.PORT || 5000,
  nodeEnv,
  isProduction,
  jwtSecret: process.env.JWT_SECRET || (isProduction ? '' : DEV_JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  // Comma-separated list of allowed browser origins. Empty = allow any origin (dev only).
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '*'),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1500,
  },
  mongodbUri: process.env.MONGODB_URI || '',
  // Platform (super admin) console login. The password has no default: if unset, that login is disabled.
  adminUsername: process.env.ADMIN_USERNAME || 'traveltrade_admin',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@travel-trade.com',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  // The only account that sees the sample data; every other company starts empty.
  demoOwnerEmail: (process.env.DEMO_OWNER_EMAIL || 'sagarpunia163@gmail.com').toLowerCase().trim(),
  demoOwnerPassword: process.env.DEMO_OWNER_PASSWORD || '',
};

if (isProduction && !config.jwtSecret) {
  throw new Error('JWT_SECRET must be set in production.');
}

module.exports = config;
