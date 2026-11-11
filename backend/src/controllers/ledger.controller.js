'use strict';

const ledgerService = require('../services/ledger.service');

async function getOwnLedger(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await ledgerService.getOwnLedger(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getLedgerByTransaction(req, res, next) {
  try {
    const entries = await ledgerService.getLedgerByTransaction(req.params.transactionId, req.user.id);
    res.status(200).json({ success: true, data: { entries } });
  } catch (err) {
    next(err);
  }
}

async function verifyLedger(req, res, next) {
  try {
    const report = await ledgerService.verifyLedgerIntegrity();
    res.status(200).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOwnLedger, getLedgerByTransaction, verifyLedger };
