const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config/env');
const apiRoutes = require('./routes');
const { store } = require('./db/store');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { responseTimeMiddleware } = require('./middlewares/responseTime.middleware');
const ApiResponse = require('./utils/apiResponse');

const app = express();

// Render and Vercel sit behind one proxy hop; this makes req.ip the real client IP
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression({ level: 6, threshold: 1024 }));
app.use(responseTimeMiddleware);

// Only our own frontends may call the API from a browser. With no CORS_ORIGIN set
// (local development) any origin is allowed.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  })
);

app.use(express.json({ limit: '5mb' }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

app.use('/api', apiLimiter);

app.get('/health', (req, res) =>
  ApiResponse.success(res, {
    status: 'UP',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    database: store.kind === 'mongo' ? 'mongodb' : 'memory',
  })
);

app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
