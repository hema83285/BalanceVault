/**
 * JWT sign and verify helpers.
 * Wraps jsonwebtoken to provide typed, testable functions.
 * Never log the token value itself.
 */

'use strict';

const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('./errors');

const JWT_SECRET = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
};

const JWT_EXPIRES_IN = () => process.env.JWT_EXPIRES_IN || '24h';

/**
 * Signs a JWT payload.
 * @param {object} payload - Data to encode (never include passwords or sensitive fields)
 * @returns {string} signed JWT token
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET(), {
    expiresIn: JWT_EXPIRES_IN(),
    algorithm: 'HS256',
  });
}

/**
 * Verifies a JWT token and returns its decoded payload.
 * Throws AuthenticationError if invalid or expired.
 * @param {string} token
 * @returns {object} decoded payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET(), { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthenticationError('Session expired. Please log in again.');
    }
    throw new AuthenticationError('Invalid authentication token.');
  }
}

/**
 * Creates a token payload from a user object.
 * Only includes non-sensitive fields needed for RBAC.
 */
function createTokenPayload(user) {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };
}

module.exports = { signToken, verifyToken, createTokenPayload };
