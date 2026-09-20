const http = require('http');
const app = require('./src/app');
const config = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');
const { seedMongoDB } = require('./src/config/seed');

const server = http.createServer(app);

const startServer = async () => {
  // Connect to MongoDB Atlas
  const connected = await connectDB();
  if (connected) {
    await seedMongoDB();
  }

  server.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`🚀 Production CRM Backend running on port ${config.port}`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
    console.log(`🍃 Database: ${connected ? 'MongoDB Atlas (Connected)' : 'In-Memory Mode (Pending Atlas IP Whitelist)'}`);
    console.log(`⚡ Performance optimizations: Gzip enabled, Metrics active`);
    console.log(`🛡️  Security: Helmet active, Rate Limiting active`);
    console.log(`📡 Healthcheck: http://localhost:${config.port}/health`);
    console.log(`🔌 API v1 Root: http://localhost:${config.port}/api/v1`);
    console.log(`====================================================`);
  });
};

// Graceful shutdown handling
const handleGracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  await disconnectDB();
  server.close(() => {
    console.log('HTTP server closed cleanly. Process exiting.');
    process.exit(0);
  });

  // Force close if graceful termination hangs
  setTimeout(() => {
    console.error('Forcing shutdown after 10s timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

// Handle uncaught errors gracefully without crashing the whole process
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
