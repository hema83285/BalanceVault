'use strict';

const adminService = require('../services/admin.service');
const transfersService = require('../services/transfers.service');
const accountFundingService = require('../services/accountFunding.service');

async function getDashboard(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const { page, limit, role, search } = req.query;
    const result = await adminService.getAllUsers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      role,
      search,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getAllTransactions(req, res, next) {
  try {
    const { page, limit, status, accountId } = req.query;
    const result = await transfersService.getAllTransactions({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      accountId,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const { page, limit, action, actorId, outcome } = req.query;
    const result = await adminService.getAuditLogs({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      action,
      actorId,
      outcome,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function demoCreditAccount(req, res, next) {
  try {
    const funding = await accountFundingService.addDemoFunds(
      req.params.id,
      req.user.id,
      req.body.amountPaise,
      req.get('Idempotency-Key'),
      { requestId: req.requestId, ipAddress: req.ip }
    );
    res.status(funding.idempotent ? 200 : 201).json({ success: true, data: { funding } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getAllUsers, getAllTransactions, getAuditLogs, demoCreditAccount };
