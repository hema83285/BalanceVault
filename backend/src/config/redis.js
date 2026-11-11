/**
 * Redis client setup using ioredis.
 * Falls back gracefully if REDIS_URL is not configured (dev mode).
 * Rate limiters check isConnected before using Redis — if not connected,
 * they fall back to in-memory limiting.
 */

'use strict';

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn(
      'REDIS_URL not set. Rate limiting will use in-memory fallback (not suitable for production).'
    );
    return null;
  }

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 5) {
        logger.error('Redis connection failed after 5 retries. Disabling Redis.');
        isConnected = false;
        return null; // stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    reconnectOnError(err) {
      logger.warn({ err: err.message }, 'Redis reconnect on error');
      return true;
    },
  });

  client.on('connect', () => {
    logger.info('Redis connected');
    isConnected = true;
  });

  client.on('ready', () => {
    isConnected = true;
  });

  client.on('error', (err) => {
    logger.error({ err: err.message }, 'Redis error');
    isConnected = false;
  });

  client.on('close', () => {
    isConnected = false;
  });

  return client;
}

function getRedisClient() {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

function isRedisConnected() {
  return isConnected;
}

async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

module.exports = { getRedisClient, isRedisConnected, disconnectRedis };
