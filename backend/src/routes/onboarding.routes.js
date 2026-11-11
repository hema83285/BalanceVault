'use strict';

const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboarding.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { submitOnboardingSchema, reviewOnboardingSchema } = require('../validators/onboarding.validator');

// Account holder routes
router.post('/', authenticate, authorize('ACCOUNT_HOLDER'), validate(submitOnboardingSchema), onboardingController.submit);
router.get('/status', authenticate, authorize('ACCOUNT_HOLDER'), onboardingController.getStatus);

// Admin routes
router.get('/admin', authenticate, authorize('ADMIN'), onboardingController.adminGetAll);
router.patch('/admin/:id', authenticate, authorize('ADMIN'), validate(reviewOnboardingSchema), onboardingController.adminReview);

module.exports = router;
