'use strict';

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { isRedisConnected } = require('../config/redis');

// Liveness probe — just confirms the app is running
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness probe — confirms DB and Redis are reachable
router.get('/ready', async (req, res) => {
  const checks = { database: false, redis: false };
  let allHealthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    allHealthy = false;
  }

  checks.redis = isRedisConnected();
  if (!checks.redis && process.env.REDIS_URL) {
    // Redis URL is configured but not connected — this is a failure
    allHealthy = false;
  }
  // If REDIS_URL is not set, skip Redis check in readiness

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
