'use strict';

const authService = require('../services/auth.service');

function buildRequestContext(req) {
  return {
    requestId: req.requestId,
    ipAddress: req.ip,
  };
}

async function register(req, res, next) {
  try {
    const { user, token } = await authService.registerUser(req.body, buildRequestContext(req));
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { user, token } = await authService.loginUser(req.body, buildRequestContext(req));
    res.status(200).json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    // JWT is stateless — logout is handled client-side by discarding the token.
    // We record the event in the audit log.
    const { auditFromRequest } = require('../services/audit.service');
    await auditFromRequest(req, {
      action: 'LOGOUT',
      targetType: 'User',
      targetId: req.user.id,
      outcome: 'SUCCESS',
    });
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me };
