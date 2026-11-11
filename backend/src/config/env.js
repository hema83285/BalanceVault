/**
 * Environment variable validation and configuration
 * Fail fast at startup if required vars are missing.
 * Never export raw secrets — only validated values.
 */

'use strict';

require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name, defaultValue) {
  return process.env[name] || defaultValue;
}

const config = {
  // ── Server ──────────────────────────────────────────────────────────────────
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '5000'), 10),

  // ── Database ─────────────────────────────────────────────────────────────────
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // ── JWT ──────────────────────────────────────────────────────────────────────
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '24h'),

  // ── Redis (optional in development) ─────────────────────────────────────────
  REDIS_URL: optionalEnv('REDIS_URL', null),

  // ── CORS ─────────────────────────────────────────────────────────────────────
  FRONTEND_URL: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),

  // ── Bcrypt ────────────────────────────────────────────────────────────────────
  BCRYPT_ROUNDS: parseInt(optionalEnv('BCRYPT_ROUNDS', '12'), 10),

  // ── Rate limiting ─────────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10), // 15 min
  LOGIN_RATE_LIMIT_MAX: parseInt(optionalEnv('LOGIN_RATE_LIMIT_MAX', '10'), 10),
  REGISTER_RATE_LIMIT_MAX: parseInt(optionalEnv('REGISTER_RATE_LIMIT_MAX', '5'), 10),
  TRANSFER_RATE_LIMIT_MAX: parseInt(optionalEnv('TRANSFER_RATE_LIMIT_MAX', '20'), 10),

  // ── Idempotency ──────────────────────────────────────────────────────────────
  IDEMPOTENCY_TTL_HOURS: parseInt(optionalEnv('IDEMPOTENCY_TTL_HOURS', '24'), 10),
};

module.exports = config;
