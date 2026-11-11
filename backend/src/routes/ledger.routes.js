'use strict';

const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledger.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// Account holder: view own ledger
router.get('/', authenticate, authorize('ACCOUNT_HOLDER'), ledgerController.getOwnLedger);
router.get('/:transactionId', authenticate, authorize('ACCOUNT_HOLDER'), ledgerController.getLedgerByTransaction);

// Admin: verify integrity
router.get('/admin/verify', authenticate, authorize('ADMIN'), ledgerController.verifyLedger);

module.exports = router;
