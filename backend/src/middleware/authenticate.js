/**
 * JWT Authentication middleware.
 * Extracts the Bearer token from Authorization header,
 * verifies it, loads the user from DB, and attaches to req.user.
 *
 * IMPORTANT: This checks the database on every request to ensure
 * the user still exists and is active. This prevents using tokens
 * for deleted/suspended users.
 */

'use strict';

const { verifyToken } = require('../utils/jwt');
const { AuthenticationError } = require('../utils/errors');
const prisma = require('../config/database');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No authentication token provided.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token); // throws if invalid/expired

    // Load fresh user from DB — don't rely solely on JWT payload
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User account not found.');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account has been deactivated.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
