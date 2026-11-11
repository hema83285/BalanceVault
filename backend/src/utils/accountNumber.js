/**
 * Unique account number generator.
 * Format: BV + 10 digits = 12 character account number
 * Example: BV2026110042
 *
 * Checks the database for collisions before returning.
 * Uses crypto.randomInt for cryptographically secure random numbers.
 */

'use strict';

const { randomInt } = require('crypto');
const prisma = require('../config/database');

/**
 * Generates a unique account number not already in the database.
 * Retries up to 10 times before throwing.
 * @returns {Promise<string>} unique account number
 */
async function generateUniqueAccountNumber() {
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const number = generateAccountNumber();

    const existing = await prisma.account.findUnique({
      where: { accountNumber: number },
      select: { id: true },
    });

    if (!existing) {
      return number;
    }
  }

  throw new Error('Failed to generate a unique account number after 10 attempts');
}

/**
 * Generates a single account number string.
 * BV + 10 random digits
 */
function generateAccountNumber() {
  // randomInt(min, max) returns integer in [min, max)
  // 10 digits: 1000000000 to 9999999999
  const digits = randomInt(1000000000, 9999999999);
  return `BV${digits}`;
}

module.exports = { generateUniqueAccountNumber };
