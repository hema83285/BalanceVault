'use strict';

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const onboardingController = require('../controllers/onboarding.controller');
const accountsController = require('../controllers/accounts.controller');
const ledgerController = require('../controllers/ledger.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { reviewOnboardingSchema } = require('../validators/onboarding.validator');
const { z } = require('zod');

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});
const demoCreditSchema = z.object({
  amountPaise: z.string().regex(/^[1-9]\d{0,11}$/, 'Amount must be a positive integer in paise.'),
});

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getAllUsers);
router.get('/transactions', adminController.getAllTransactions);
router.get('/audit-logs', adminController.getAuditLogs);

// Onboarding management
router.get('/onboarding', onboardingController.adminGetAll);
router.patch('/onboarding/:id', validate(reviewOnboardingSchema), onboardingController.adminReview);

// Account management
router.get('/accounts', accountsController.adminGetAll);
router.patch('/accounts/:id/status', validate(updateStatusSchema), accountsController.adminUpdateStatus);
router.post('/accounts/:id/demo-credit', validate(demoCreditSchema), adminController.demoCreditAccount);

// Ledger verification
router.get('/ledger/verify', ledgerController.verifyLedger);

module.exports = router;
