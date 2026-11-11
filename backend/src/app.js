/**
 * Express application setup.
 * Separated from server.ts so it can be imported cleanly in tests.
 */

'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');

const requestIdMiddleware = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const onboardingRoutes = require('./routes/onboarding.routes');
const accountsRoutes = require('./routes/accounts.routes');
const transfersRoutes = require('./routes/transfers.routes');
const ledgerRoutes = require('./routes/ledger.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ── Security headers (Helmet) ──────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow frontend integration
  })
);

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  })
);

// ── Request ID (before logging so it appears in logs) ─────────────────────────
app.use(requestIdMiddleware);

// ── HTTP request logging ───────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: req.requestId }),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    })
  );
}

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Trust proxy (Render/Vercel sit behind a proxy) ────────────────────────────
app.set('trust proxy', 1);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.requestId,
  });
});

// ── Centralized error handler (must be last) ──────────────────────────────────
app.use(errorHandler);

module.exports = app;
