const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

const connectDB = async () => {
  if (!config.mongodbUri) {
    console.warn('⚠️  MONGODB_URI is not defined in environment variables. Running in-memory mode.');
    return false;
  }

  try {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      console.log('🍃 MongoDB Atlas connected successfully!');
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('⚠️  MongoDB disconnected.');
    });

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    isConnected = true;
    return true;
  } catch (error) {
    isConnected = false;
    console.error('====================================================');
    console.error('⚠️  MongoDB Atlas Connection Failed:');
    console.error(error.message);
    console.error('👉 TIP: If you see "Could not connect to any servers",');
    console.error('   please whitelist your IP or allow 0.0.0.0/0 in MongoDB Atlas:');
    console.error('   Atlas Dashboard -> Security -> Network Access -> Add IP (0.0.0.0/0)');
    console.error('====================================================');
    return false;
  }
};

const disconnectDB = async () => {
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
