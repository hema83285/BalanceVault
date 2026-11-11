/**
 * Custom application error classes.
 * Using typed errors lets the centralized error handler respond
 * with the correct HTTP status code without try/catch everywhere.
 */

'use strict';

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.isOperational = true; // vs programmer errors (bugs)
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message) {
    super(message || 'Authentication required', 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message) {
    super(message || 'Access denied', 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource || 'Resource'} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

class InsufficientFundsError extends AppError {
  constructor() {
    super('Insufficient balance for this transfer', 422, 'INSUFFICIENT_FUNDS');
  }
}

class AccountSuspendedError extends AppError {
  constructor() {
    super('Account is not active', 422, 'ACCOUNT_NOT_ACTIVE');
  }
}

class IdempotencyError extends AppError {
  constructor() {
    super('Idempotency-Key header is required for this operation', 400, 'IDEMPOTENCY_KEY_REQUIRED');
  }
}

class RateLimitError extends AppError {
  constructor() {
    super('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InsufficientFundsError,
  AccountSuspendedError,
  IdempotencyError,
  RateLimitError,
};
