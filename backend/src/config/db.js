const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;
let reconnectTimer = null;
let isConnecting = false;

const connectDB = async () => {
  if (!config.mongodbUri) {
    console.warn('⚠️  MONGODB_URI is not defined in environment variables. Running in-memory mode.');
    return false;
  }

  if (isConnecting) return false;
  isConnecting = true;

  try {
    if (mongoose.connection.listeners('connected').length === 0) {
      mongoose.connection.on('connected', async () => {
        isConnected = true;
        isConnecting = false;
        console.log('🍃 MongoDB Atlas connected successfully!');
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        try {
          const { seedMongoDB } = require('./seed');
          await seedMongoDB();
        } catch (e) {
          console.warn('Sync on connect note:', e.message);
        }
      });

      mongoose.connection.on('error', (err) => {
        isConnected = false;
        console.error('❌ MongoDB connection error:', err.message);
        scheduleReconnect();
      });

      mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.warn('⚠️  MongoDB disconnected.');
        scheduleReconnect();
      });
    }

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
      autoIndex: true,
    });

    isConnected = true;
    isConnecting = false;
    return true;
  } catch (error) {
    isConnected = false;
    isConnecting = false;
    console.error('====================================================');
    console.error('⚠️  MongoDB Atlas Connection Failed:');
    console.error(error.message);
    console.error('👉 Retrying connection in 5 seconds in background...');
    console.error('====================================================');
    scheduleReconnect();
    return false;
  }
};

const scheduleReconnect = () => {
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      console.log('🔄 Retrying MongoDB Atlas connection...');
      connectDB().catch(() => {});
    }, 5000);
  }
};

const disconnectDB = async () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🍃 MongoDB disconnected cleanly.');
  }
};

const isDbConnected = () => isConnected && mongoose.connection.readyState === 1;

module.exports = {
  connectDB,
  disconnectDB,
  isDbConnected,
  mongoose,
};
