const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'crm_default_jwt_secret_key_change_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500, // max 500 req per window
  },
  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'crm',
  adminUsername: process.env.ADMIN_USERNAME || 'traveltrade_admin',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@travel-trade.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'TravelTrade#Admin2026!',
};
