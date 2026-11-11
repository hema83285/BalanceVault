/**
 * Authentication Service
 * Handles user registration, login, and current-user retrieval.
 *
 * Security rules enforced here:
 * - Role is ALWAYS hardcoded to ACCOUNT_HOLDER on registration.
 *   The role field is never accepted from the request body.
 * - Passwords are hashed with bcrypt before storage.
 * - Login uses constant-time comparison (bcrypt.compare) to prevent timing attacks.
 * - On failed login, we do NOT reveal whether the email exists.
 */

'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { signToken, createTokenPayload } = require('../utils/jwt');
const { ConflictError, AuthenticationError } = require('../utils/errors');
const { recordAudit } = require('./audit.service');
const config = require('../config/env');

/**
 * Register a new ACCOUNT_HOLDER user.
 */
async function registerUser(data, requestContext = {}) {
  const { email, password, fullName } = data;

  // Check for duplicate email
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    // Audit failed registration attempt (email conflict)
    await recordAudit({
      actorId: null,
      action: 'USER_REGISTERED',
      targetType: 'User',
      outcome: 'FAILURE',
      requestId: requestContext.requestId,
      ipAddress: requestContext.ipAddress,
      metadata: { reason: 'email_already_exists', email },
    });
    throw new ConflictError('An account with this email address already exists.');
  }

  // Hash password — NEVER store plaintext
  const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

  // Create user — role hardcoded to ACCOUNT_HOLDER
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: 'ACCOUNT_HOLDER', // HARDCODED — never from request body
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
    },
  });

  // Audit successful registration
  await recordAudit({
    actorId: user.id,
    action: 'USER_REGISTERED',
    targetType: 'User',
    targetId: user.id,
    outcome: 'SUCCESS',
    requestId: requestContext.requestId,
    ipAddress: requestContext.ipAddress,
    metadata: { email: user.email, fullName: user.fullName },
  });

  const token = signToken(createTokenPayload(user));

  return { user, token };
}

/**
 * Authenticate a user and return a JWT.
 */
async function loginUser(data, requestContext = {}) {
  const { email, password } = data;

  // Load user including passwordHash (not in default select)
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });

  // Use bcrypt.compare even if user not found to prevent timing-based email enumeration
  const dummyHash = '$2a$12$invalidhashfortimingnormalization00000000000000000000000';
  const isValid = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, dummyHash);

  if (!user || !isValid) {
    await recordAudit({
      actorId: user?.id || null,
      action: 'LOGIN_FAILED',
      targetType: 'User',
      targetId: user?.id || null,
      outcome: 'FAILURE',
      requestId: requestContext.requestId,
      ipAddress: requestContext.ipAddress,
      metadata: { email, reason: !user ? 'user_not_found' : 'invalid_password' },
    });
    // Generic message — do not reveal which field was wrong
    throw new AuthenticationError('Invalid email or password.');
  }

  if (!user.isActive) {
    await recordAudit({
      actorId: user.id,
      action: 'LOGIN_FAILED',
      targetType: 'User',
      targetId: user.id,
      outcome: 'FAILURE',
      requestId: requestContext.requestId,
      ipAddress: requestContext.ipAddress,
      metadata: { reason: 'account_deactivated' },
    });
    throw new AuthenticationError('Your account has been deactivated. Contact support.');
  }

  // Strip passwordHash before creating payload
  const { passwordHash: _, ...safeUser } = user;

  await recordAudit({
    actorId: user.id,
    action: 'LOGIN_SUCCESS',
    targetType: 'User',
    targetId: user.id,
    outcome: 'SUCCESS',
    requestId: requestContext.requestId,
    ipAddress: requestContext.ipAddress,
    metadata: { email: user.email },
  });

  const token = signToken(createTokenPayload(safeUser));

  return { user: safeUser, token };
}

/**
 * Returns the current authenticated user's profile.
 */
async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      onboarding: {
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  return user;
}

module.exports = { registerUser, loginUser, getCurrentUser };
