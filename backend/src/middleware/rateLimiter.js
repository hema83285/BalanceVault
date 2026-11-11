/**
 * Redis-backed rate limiters for sensitive endpoints.
 * Falls back to in-memory rate limiting if Redis is unavailable.
 *
 * Configured limits (can be overridden via env vars):
 *   Login:     10 attempts per 15 minutes per IP
 *   Register:   5 attempts per 15 minutes per IP
 *   Transfers: 20 attempts per 15 minutes per user
 */

'use strict';

const rateLimit = require('express-rate-limit');

// Try to import redis store — only used if Redis is available
let RedisStore;
try {
  // rate-limit-redis is optional; if not installed, we use memory store
  RedisStore = require('rate-limit-redis');
} catch {
  RedisStore = null;
}

const { getRedisClient, isRedisConnected } = require('../config/redis');

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min

function buildStore() {
  if (RedisStore && isRedisConnected()) {
    const client = getRedisClient();
    return new RedisStore({ sendCommand: (...args) => client.call(...args) });
  }
  return undefined; // falls back to express-rate-limit's built-in memory store
}

/**
 * Login rate limiter: 10 attempts per 15 min per IP
 */
const loginRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  store: buildStore(),
  skip: () => process.env.NODE_ENV === 'test', // disable in tests
});

/**
 * Registration rate limiter: 5 attempts per 15 min per IP
 */
const registerRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: parseInt(process.env.REGISTER_RATE_LIMIT_MAX || '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many registration attempts. Please try again in 15 minutes.',
  },
  store: buildStore(),
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Transfer rate limiter: 20 attempts per 15 min per authenticated user
 * Uses user ID as key (not IP) so VPN/proxy changes don't reset the counter.
 */
const transferRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: parseInt(process.env.TRANSFER_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many transfer attempts. Please try again in 15 minutes.',
  },
  store: buildStore(),
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * General API rate limiter: 100 requests per 15 min per IP
 */
const generalRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore(),
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = {
  loginRateLimiter,
  registerRateLimiter,
  transferRateLimiter,
  generalRateLimiter,
};
