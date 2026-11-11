'use strict';

module.exports = async function teardown() {
  // Prisma client is disconnected in individual test files
  // This global teardown is a safety net
  console.log('Test teardown complete.');
};
