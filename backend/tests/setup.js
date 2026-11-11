'use strict';

require('dotenv').config();

module.exports = async function setup() {
  process.env.NODE_ENV = 'test';

  // Always use the isolated test database
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    console.log('Using isolated test database: balancevault_test');
  } else {
    console.warn('WARNING: TEST_DATABASE_URL not set — using DATABASE_URL (may affect dev data)');
  }
};
