module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/utils/logger.js',
    '!src/utils/seeder.js'
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    }
  },
  setupFiles: ['./tests/test-config.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 30000, // Increased timeout for MongoDB memory server
  forceExit: true,
  clearMocks: true
};
