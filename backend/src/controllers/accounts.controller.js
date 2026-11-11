'use strict';

const accountsService = require('../services/accounts.service');

function buildRequestContext(req) {
  return { requestId: req.requestId, ipAddress: req.ip };
}

async function createAccount(req, res, next) {
  try {
    const account = await accountsService.createAccount(req.user.id, buildRequestContext(req));
    res.status(201).json({ success: true, data: { account } });
  } catch (err) {
    next(err);
  }
}

async function getOwnAccounts(req, res, next) {
  try {
    const accounts = await accountsService.getOwnAccounts(req.user.id);
    res.status(200).json({ success: true, data: { accounts } });
  } catch (err) {
    next(err);
  }
}

async function getAccountById(req, res, next) {
  try {
    const account = await accountsService.getAccountById(
      req.params.id,
      req.user.id,
      req.user.role === 'ADMIN'
    );
    res.status(200).json({ success: true, data: { account } });
  } catch (err) {
    next(err);
  }
}

async function adminGetAll(req, res, next) {
  try {
    const { page, limit, status, userId } = req.query;
    const result = await accountsService.getAllAccounts({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      userId,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function adminUpdateStatus(req, res, next) {
  try {
    const updated = await accountsService.updateAccountStatus(
      req.params.id,
      req.body.status,
      req.user.id,
      buildRequestContext(req)
    );
    res.status(200).json({ success: true, data: { account: updated } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createAccount, getOwnAccounts, getAccountById, adminGetAll, adminUpdateStatus };
