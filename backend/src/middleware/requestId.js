/**
 * Request ID middleware.
 * Attaches a unique UUID v4 to every incoming request as req.requestId.
 * Also sets it in the response header X-Request-ID so clients can trace issues.
 * The requestId is included in audit logs for traceability.
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

function requestIdMiddleware(req, res, next) {
  // Accept from client header (e.g., load balancer) or generate new
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

module.exports = requestIdMiddleware;
