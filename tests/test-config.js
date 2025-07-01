/**
 * Test configuration file to override environment variables
 * This file is loaded before any tests run
 */

// Override environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_REFRESH_EXPIRE = '1d';
process.env.PORT = '8000';

// Prevent actual database connection - let setup.js handle MongoDB connection
process.env.MONGO_URI = 'mongodb://in-memory-test-server';

// Set email configuration for tests
process.env.EMAIL_FROM = 'test@example.com';
process.env.EMAIL_FROM_NAME = 'Test System';
process.env.FRONTEND_URL = 'http://test.com';

module.exports = {
  testEnvironment: 'node'
};
