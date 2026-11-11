'use strict';

const onboardingService = require('../services/onboarding.service');

function buildRequestContext(req) {
  return { requestId: req.requestId, ipAddress: req.ip };
}

async function submit(req, res, next) {
  try {
    const onboarding = await onboardingService.submitOnboarding(
      req.user.id,
      req.body,
      buildRequestContext(req)
    );
    res.status(201).json({ success: true, data: { onboarding } });
  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const onboarding = await onboardingService.getOwnOnboardingStatus(req.user.id);
    res.status(200).json({ success: true, data: { onboarding } });
  } catch (err) {
    next(err);
  }
}

async function adminGetAll(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const result = await onboardingService.getAllOnboardings({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function adminReview(req, res, next) {
  try {
    const updated = await onboardingService.reviewOnboarding(
      req.params.id,
      req.body,
      req.user.id,
      buildRequestContext(req)
    );
    res.status(200).json({ success: true, data: { onboarding: updated } });
  } catch (err) {
    next(err);
  }
}

module.exports = { submit, getStatus, adminGetAll, adminReview };
