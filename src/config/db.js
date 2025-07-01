const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Log if MongoDB disconnects
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    // Log if MongoDB reconnects
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
    // Log if MongoDB error
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });
    
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
