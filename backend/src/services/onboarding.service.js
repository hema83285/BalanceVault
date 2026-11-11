/**
 * Onboarding Service
 * Handles submission and admin review of onboarding applications.
 */

'use strict';

const prisma = require('../config/database');
const { ConflictError, NotFoundError, ValidationError } = require('../utils/errors');
const { recordAudit } = require('./audit.service');

/**
 * Submit onboarding details for the authenticated user.
 * Throws if user has already submitted.
 */
async function submitOnboarding(userId, data, requestContext = {}) {
  // One onboarding per user
  const existing = await prisma.onboarding.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });

  if (existing) {
    if (existing.status === 'REJECTED') {
      // Allow resubmission if rejected
      const updated = await prisma.onboarding.update({
        where: { userId },
        data: {
          ...data,
          dateOfBirth: new Date(data.dateOfBirth),
          status: 'PENDING',
          reviewNote: null,
          reviewedBy: null,
          reviewedAt: null,
        },
      });

      await recordAudit({
        actorId: userId,
        action: 'ONBOARDING_SUBMITTED',
        targetType: 'Onboarding',
        targetId: updated.id,
        outcome: 'SUCCESS',
        requestId: requestContext.requestId,
        ipAddress: requestContext.ipAddress,
        metadata: { resubmission: true },
      });

      return updated;
    }

    throw new ConflictError(
      `You already have an onboarding application with status: ${existing.status}`
    );
  }

  const onboarding = await prisma.onboarding.create({
    data: {
      userId,
      phone: data.phone,
      address: data.address,
      dateOfBirth: new Date(data.dateOfBirth),
      occupation: data.occupation,
      status: 'PENDING',
    },
  });

  await recordAudit({
    actorId: userId,
    action: 'ONBOARDING_SUBMITTED',
    targetType: 'Onboarding',
    targetId: onboarding.id,
    outcome: 'SUCCESS',
    requestId: requestContext.requestId,
    ipAddress: requestContext.ipAddress,
  });

  return onboarding;
}

/**
 * Get onboarding status for the authenticated user.
 */
async function getOwnOnboardingStatus(userId) {
  const onboarding = await prisma.onboarding.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      reviewNote: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return onboarding; // null if not submitted yet
}

/**
 * Admin: Get all onboarding applications with pagination.
 */
async function getAllOnboardings({ page = 1, limit = 20, status } = {}) {
  const skip = (page - 1) * limit;
  const where = status ? { status } : {};

  const [items, total] = await prisma.$transaction([
    prisma.onboarding.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, fullName: true },
        },
      },
    }),
    prisma.onboarding.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Admin: Approve or reject an onboarding application.
 * If approved, automatically creates an account for the user.
 */
async function reviewOnboarding(onboardingId, reviewData, adminId, requestContext = {}) {
  const { status, reviewNote } = reviewData;

  const onboarding = await prisma.onboarding.findUnique({
    where: { id: onboardingId },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!onboarding) {
    throw new NotFoundError('Onboarding application');
  }

  if (onboarding.status !== 'PENDING') {
    throw new ValidationError(
      `This application has already been reviewed (status: ${onboarding.status})`
    );
  }

  const updated = await prisma.onboarding.update({
    where: { id: onboardingId },
    data: {
      status,
      reviewNote: reviewNote || null,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });

  const auditAction = status === 'APPROVED' ? 'ONBOARDING_APPROVED' : 'ONBOARDING_REJECTED';

  await recordAudit({
    actorId: adminId,
    action: auditAction,
    targetType: 'Onboarding',
    targetId: onboardingId,
    outcome: 'SUCCESS',
    requestId: requestContext.requestId,
    ipAddress: requestContext.ipAddress,
    metadata: {
      userId: onboarding.userId,
      reviewNote: reviewNote || null,
      newStatus: status,
    },
  });

  await recordAudit({
    actorId: adminId,
    action: 'ADMIN_ACTION',
    targetType: 'Onboarding',
    targetId: onboardingId,
    outcome: 'SUCCESS',
    requestId: requestContext.requestId,
    metadata: { action: 'onboarding_review', newStatus: status },
  });

  return updated;
}

module.exports = {
  submitOnboarding,
  getOwnOnboardingStatus,
  getAllOnboardings,
  reviewOnboarding,
};
