const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'crm_default_jwt_secret_key_change_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500, // max 500 req per window
  },
  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'crm',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@travel-trade.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  // Public URLs used inside emails (login button, unsubscribe links)
  appUrl: (process.env.APP_URL || 'https://crm-amber-nine.vercel.app').replace(/\/$/, ''),
  apiPublicUrl: (process.env.API_PUBLIC_URL || 'https://crm-ep4i.onrender.com').replace(/\/$/, ''),
  // Platform transactional mail (registration thank-you etc.). Recommended free provider: Maileroo SMTP.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@travel-trade.com',
  },
  // Key for encrypting owners' SMTP passwords at rest (falls back to JWT secret)
  mailEncKey: process.env.MAIL_ENC_KEY || '',
};
