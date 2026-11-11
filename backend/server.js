/**
 * HTTP Server entry point.
 * Handles graceful shutdown on SIGTERM/SIGINT (important for Render).
 */

'use strict';

require('dotenv').config();

const app = require('./src/app');
const prisma = require('./src/config/database');
const { getRedisClient, disconnectRedis } = require('./src/config/redis');
const logger = require('./src/utils/logger');

const PORT = parseInt(process.env.PORT || '5000', 10);

// Initialize Redis connection on startup
getRedisClient();

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, 'BalanceVault API server started');
});

// ── Graceful shutdown ──────────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  logger.info({ signal }, 'Received shutdown signal — closing server gracefully');

  server.close(async () => {
    try {
      await prisma.$disconnect();
      await disconnectRedis();
      logger.info('Server shut down cleanly');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Unhandled rejection safety net ───────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});

module.exports = server;
