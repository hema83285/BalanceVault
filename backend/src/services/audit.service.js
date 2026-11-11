/**
 * Audit Log Service — Append-only
 *
 * This service writes audit records. It is intentionally simple.
 * Rules:
 *   - Never update or delete audit records (append-only).
 *   - Never log passwords, tokens, or secrets.
 *   - Called from other services after key operations.
 *   - If audit logging fails, it logs the failure but does NOT
 *     fail the main operation (audit is best-effort for non-financial ops).
 *   - For financial operations (transfers), audit is part of the DB transaction.
 */

'use strict';

const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Records an audit event.
 * @param {object} params
 * @param {string|null} params.actorId - ID of the user performing the action
 * @param {string} params.action - AuditAction enum value
 * @param {string|null} params.targetType - e.g. 'User', 'Account', 'Transaction'
 * @param {string|null} params.targetId - ID of the affected resource
 * @param {'SUCCESS'|'FAILURE'} params.outcome
 * @param {string|null} params.requestId - From req.requestId
 * @param {string|null} params.ipAddress - From req.ip
 * @param {string|null} params.userAgent - From req.headers['user-agent']
 * @param {object|null} params.metadata - Safe additional context
 * @param {import('@prisma/client').Prisma.TransactionClient} [tx] - Optional Prisma tx client
 */
async function recordAudit(params, tx) {
  const {
    actorId = null,
    action,
    targetType = null,
    targetId = null,
    outcome,
    requestId = null,
    ipAddress = null,
    userAgent = null,
    metadata = null,
  } = params;

  const client = tx || prisma;

  try {
    await client.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        outcome,
        requestId,
        ipAddress,
        userAgent: userAgent ? userAgent.substring(0, 500) : null, // cap length
        metadata,
      },
    });
  } catch (err) {
    // Audit failure should not crash the application
    // but we log it loudly so ops can investigate
    logger.error(
      { err: err.message, action, actorId, targetId },
      'CRITICAL: Failed to write audit log'
    );
  }
}

/**
 * Convenience wrapper to build audit params from an Express request.
 * @param {import('express').Request} req
 * @param {object} extra - action, targetType, targetId, outcome, metadata
 */
function auditFromRequest(req, extra) {
  return recordAudit({
    actorId: req.user?.id || null,
    requestId: req.requestId || null,
    ipAddress: req.ip || null,
    userAgent: req.headers?.['user-agent'] || null,
    ...extra,
  });
}

module.exports = { recordAudit, auditFromRequest };
