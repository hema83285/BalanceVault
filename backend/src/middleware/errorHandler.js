/**
 * Centralized Express error handler.
 * Must be registered LAST (after all routes) with 4 parameters.
 *
 * Handles:
 * - Operational AppErrors (typed, expected errors)
 * - Prisma errors (DB constraint violations, not found, etc.)
 * - Unknown programmer errors (500 with sanitized message)
 *
 * Never leaks internal error details to the client in production.
 */

'use strict';

const { AppError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const requestId = req.requestId || 'unknown';

  // ── Prisma known request errors ──────────────────────────────────────────────
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaError = handlePrismaError(err);
    logger.warn({ requestId, code: err.code, model: err.meta?.modelName }, prismaError.message);
    return res.status(prismaError.statusCode).json({
      success: false,
      code: prismaError.code,
      message: prismaError.message,
      requestId,
    });
  }

  // ── Prisma validation errors ──────────────────────────────────────────────────
  if (err.constructor?.name === 'PrismaClientValidationError') {
    logger.warn({ requestId }, 'Prisma validation error');
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid data provided.',
      requestId,
    });
  }

  // ── Operational AppErrors (expected) ──────────────────────────────────────────
  if (err instanceof AppError) {
    // Log at warn level for client errors, error level for server errors
    if (err.statusCode >= 500) {
      logger.error({ requestId, err }, err.message);
    } else {
      logger.warn({ requestId, code: err.code }, err.message);
    }

    const response = {
      success: false,
      code: err.code,
      message: err.message,
      requestId,
    };

    // Include field-level validation details if present
    if (err instanceof ValidationError && err.details) {
      response.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // ── Unknown / programmer errors ────────────────────────────────────────────────
  logger.error({ requestId, err }, 'Unhandled error');

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : err.message,
    requestId,
  });
}

/**
 * Maps Prisma error codes to AppError-like responses.
 */
function handlePrismaError(err) {
  switch (err.code) {
    case 'P2002': // Unique constraint violation
      return {
        statusCode: 409,
        code: 'CONFLICT',
        message: `A record with this ${err.meta?.target?.join(', ') || 'value'} already exists.`,
      };
    case 'P2025': // Record not found
      return { statusCode: 404, code: 'NOT_FOUND', message: 'Record not found.' };
    case 'P2003': // Foreign key constraint
      return {
        statusCode: 400,
        code: 'INVALID_REFERENCE',
        message: 'Referenced record does not exist.',
      };
    case 'P2034': // Transaction conflict (serialization)
      return {
        statusCode: 409,
        code: 'TRANSACTION_CONFLICT',
        message: 'Concurrent modification detected. Please retry.',
      };
    default:
      return { statusCode: 500, code: 'DATABASE_ERROR', message: 'A database error occurred.' };
  }
}

module.exports = errorHandler;
