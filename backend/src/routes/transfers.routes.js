'use strict';

const express = require('express');
const router = express.Router();
const transfersController = require('../controllers/transfers.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { transferRateLimiter } = require('../middleware/rateLimiter');
const { transferSchema } = require('../validators/transfers.validator');

router.post(
  '/',
  authenticate,
  authorize('ACCOUNT_HOLDER'),
  transferRateLimiter,
  validate(transferSchema),
  transfersController.initiateTransfer
);

router.get('/', authenticate, authorize('ACCOUNT_HOLDER'), transfersController.getOwnTransfers);
router.get('/:id', authenticate, authorize('ACCOUNT_HOLDER'), transfersController.getTransferById);

module.exports = router;
