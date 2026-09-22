const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    logger.warn('Running in disconnected/fallback database state until MongoDB is available.');
    return null;
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Retrying connection...');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB error: ${err.message}`);
});

module.exports = connectDB;
