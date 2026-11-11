/**
 * Role-based authorization middleware factory.
 * Usage: router.get('/admin/...', authenticate, authorize('ADMIN'), handler)
 *
 * Always call authenticate BEFORE authorize.
 * Throws 403 if the authenticated user does not have the required role.
 */

'use strict';

const { AuthorizationError } = require('../utils/errors');

/**
 * @param {...string} roles - Allowed roles (e.g., 'ADMIN', 'ACCOUNT_HOLDER')
 * @returns Express middleware
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required before authorization check.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
        )
      );
    }

    next();
  };
}

module.exports = authorize;
