const http = require('http');
const mongoose = require('mongoose');
const config = require('./src/config/env');
const app = require('./src/app');
const { bootstrap } = require('./src/db/bootstrap');

const server = http.createServer(app);

const start = async () => {
  await bootstrap();
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`CRM API listening on port ${config.port} (${config.nodeEnv})`);
  });
};

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down.`);
  server.close(async () => {
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
