/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  maxWorkers: 1,
  testTimeout: 30000,
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',

};
