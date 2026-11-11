'use strict';

const transfersService = require('../services/transfers.service');
const { IdempotencyError } = require('../utils/errors');

function buildRequestContext(req) {
  return { requestId: req.requestId, ipAddress: req.ip };
}

async function initiateTransfer(req, res, next) {
  try {
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
      throw new IdempotencyError();
    }

    const result = await transfersService.executeTransfer(
      req.user.id,
      req.body,
      idempotencyKey,
      buildRequestContext(req)
    );

    // 200 for idempotent replay, 201 for new transfer
    const statusCode = result.idempotent ? 200 : 201;
    res.status(statusCode).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getOwnTransfers(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await transfersService.getOwnTransfers(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getTransferById(req, res, next) {
  try {
    const transaction = await transfersService.getTransferById(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: { transaction } });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiateTransfer, getOwnTransfers, getTransferById };
