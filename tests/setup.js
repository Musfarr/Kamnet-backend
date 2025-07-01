// Set up MongoDB Memory Server for testing

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createLogger } = require('../src/utils/logger');

const logger = createLogger();
let mongoServer;

// Tell backend not to connect to the real DB
global.dbConnection = true;

// Override database connection for testing
jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => {
    return Promise.resolve();
  })
}));

// Setup in-memory MongoDB for testing
beforeAll(async () => {
  try {
    // Create MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('Connected to the in-memory test database');
  } catch (error) {
    logger.error(`Error connecting to in-memory database: ${error.message}`);
    process.exit(1);
  }
});

// Clear all collections after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany();
    }
  }
});

// Close connection when tests finish
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Global mock to prevent actual email sending
process.env.EMAIL_TEST_MODE = 'true';
