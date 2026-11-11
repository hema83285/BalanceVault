'use strict';

const express = require('express');
const router = express.Router();
const accountsController = require('../controllers/accounts.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { z } = require('zod');
const validate = require('../middleware/validate');

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED'], { required_error: 'Status must be ACTIVE or SUSPENDED' }),
});

// Account holder routes
router.post('/', authenticate, authorize('ACCOUNT_HOLDER'), accountsController.createAccount);
router.get('/', authenticate, authorize('ACCOUNT_HOLDER'), accountsController.getOwnAccounts);
router.get('/:id', authenticate, accountsController.getAccountById); // ownership enforced in service

// Admin routes
router.get('/admin/all', authenticate, authorize('ADMIN'), accountsController.adminGetAll);
router.patch('/admin/:id/status', authenticate, authorize('ADMIN'), validate(updateStatusSchema), accountsController.adminUpdateStatus);

module.exports = router;
