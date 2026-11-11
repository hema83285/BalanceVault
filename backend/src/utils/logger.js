/**
 * Structured logger using pino.
 * Pino serializes objects safely — it will NOT accidentally log
 * password fields if the serializer is configured to redact them.
 *
 * Redacted paths: password, passwordHash, token, authorization, cookie
 * These fields will appear as "[Redacted]" in logs.
 */

'use strict';

const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: [
      'password',
      'passwordHash',
      'password_hash',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.newPassword',
      'body.currentPassword',
    ],
    censor: '[Redacted]',
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

module.exports = logger;
