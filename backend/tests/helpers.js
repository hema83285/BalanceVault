/**
 * Test helpers — shared utilities for test suites.
 */
'use strict';

const prisma = require('../src/config/database');
const bcrypt = require('bcryptjs');

/**
 * Create a test user directly in the database (bypasses HTTP).
 */
async function createTestUser(overrides = {}) {
  const defaults = {
    email: `test_${Date.now()}@example.com`,
    passwordHash: await bcrypt.hash('TestPass123', 4), // low rounds for speed
    fullName: 'Test User',
    role: 'ACCOUNT_HOLDER',
    isActive: true,
  };
  return prisma.user.create({ data: { ...defaults, ...overrides } });
}

/**
 * Create a test admin.
 */
async function createTestAdmin(overrides = {}) {
  return createTestUser({ role: 'ADMIN', email: `admin_${Date.now()}@example.com`, ...overrides });
}

/**
 * Create approved onboarding for a user.
 */
async function createApprovedOnboarding(userId) {
  return prisma.onboarding.create({
    data: {
      userId,
      phone: '9876543210',
      address: '123 Test Street, Test City, Test State 400001',
      dateOfBirth: new Date('1990-01-01'),
      occupation: 'Software Engineer',
      status: 'APPROVED',
      reviewedBy: 'system',
      reviewedAt: new Date(),
    },
  });
}

/**
 * Create an ACTIVE account for a user.
 */
async function createTestAccount(userId, balancePaise = BigInt(100000)) {
  const { generateUniqueAccountNumber } = require('../src/utils/accountNumber');
  const accountNumber = await generateUniqueAccountNumber();
  return prisma.account.create({
    data: {
      userId,
      accountNumber,
      balancePaise,
      status: 'ACTIVE',
    },
  });
}

/**
 * Clean up all test data. Call in afterAll/afterEach.
 */
async function cleanDatabase() {
  // Delete in correct order (respecting foreign keys)
  await prisma.idempotencyRecord.deleteMany();
  await prisma.accountFunding.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.onboarding.deleteMany();
  await prisma.user.deleteMany();
}

module.exports = {
  createTestUser,
  createTestAdmin,
  createApprovedOnboarding,
  createTestAccount,
  cleanDatabase,
};
