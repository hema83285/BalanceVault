/**
 * Accounts Service
 * Handles account creation, retrieval, and status management.
 *
 * Key rules:
 * - Account can only be created after onboarding is APPROVED.
 * - Only one account per user (can be relaxed later).
 * - Balances are NEVER modified here — only transfers.service does that.
 * - Users can only access their own accounts.
 * - Admins can view and manage all accounts.
 */

'use strict';

const prisma = require('../config/database');
const { generateUniqueAccountNumber } = require('../utils/accountNumber');
const {
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthorizationError,
} = require('../utils/errors');
const { recordAudit } = require('./audit.service');

/**
 * Create an account for a user (requires APPROVED onboarding).
 */
async function createAccount(userId, requestContext = {}) {
  // Check onboarding status
  const onboarding = await prisma.onboarding.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });

  if (!onboarding) {
    throw new ValidationError('You must complete onboarding before creating an account.');
  }

  if (onboarding.status !== 'APPROVED') {
    throw new ValidationError(
      `Account creation requires approved onboarding. Current status: ${onboarding.status}`
    );
  }

  // Check for existing account
  const existing = await prisma.account.findFirst({
    where: { userId },
    select: { id: true, accountNumber: true },
  });

  if (existing) {
    throw new ConflictError('You already have an account.');
  }

  const accountNumber = await generateUniqueAccountNumber();

  const account = await prisma.account.create({
    data: {
      userId,
      accountNumber,
      balancePaise: BigInt(0),
      status: 'ACTIVE',
    },
    select: {
      id: true,
      accountNumber: true,
      balancePaise: true,
      status: true,
      createdAt: true,
    },
  });

  await recordAudit({
    actorId: userId,
    action: 'ACCOUNT_CREATED',
    targetType: 'Account',
    targetId: account.id,
    outcome: 'SUCCESS',
    requestId: requestContext.requestId,
    ipAddress: requestContext.ipAddress,
    metadata: { accountNumber: account.accountNumber },
  });

  return serializeAccount(account);
}

/**
 * Get own account(s) for authenticated user.
 */
async function getOwnAccounts(userId) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      accountNumber: true,
      balancePaise: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return accounts.map(serializeAccount);
}

/**
 * Get a specific account by ID — enforces ownership for non-admin users.
 */
async function getAccountById(accountId, requestingUserId, isAdmin = false) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      user: { select: { id: true, email: true, fullName: true } },
    },
  });

  if (!account) {
    throw new NotFoundError('Account');
  }

  // Ownership check: non-admin users can only see their own accounts
  if (!isAdmin && account.userId !== requestingUserId) {
    throw new AuthorizationError('You do not have permission to access this account.');
  }

  return serializeAccount(account);
}

/**
 * Admin: Get all accounts with pagination.
 */
async function getAllAccounts({ page = 1, limit = 20, status, userId } = {}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(status && { status }),
    ...(userId && { userId }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.account.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
    }),
    prisma.account.count({ where }),
  ]);

  return {
    items: items.map(serializeAccount),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Admin: Change account status (ACTIVE / SUSPENDED).
 */
async function updateAccountStatus(accountId, newStatus, adminId, requestContext = {}) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, status: true, userId: true, accountNumber: true },
  });

  if (!account) {
    throw new NotFoundError('Account');
  }

  if (!['ACTIVE', 'SUSPENDED'].includes(newStatus)) {
    throw new ValidationError('Status must be ACTIVE or SUSPENDED.');
  }

  if (account.status === newStatus) {
    throw new ConflictError(`Account is already ${newStatus}.`);
  }

  const updated = await prisma.account.update({
    where: { id: accountId },
    data: { status: newStatus },
    select: { id: true, accountNumber: true, status: true, updatedAt: true },
  });

  await recordAudit({
    actorId: adminId,
    action: 'ACCOUNT_STATUS_CHANGED',
    targetType: 'Account',
    targetId: accountId,
    outcome: 'SUCCESS',
    requestId: requestContext.requestId,
    metadata: {
      previousStatus: account.status,
      newStatus,
      accountNumber: account.accountNumber,
      ownerId: account.userId,
    },
  });

  await recordAudit({
    actorId: adminId,
    action: 'ADMIN_ACTION',
    targetType: 'Account',
    targetId: accountId,
    outcome: 'SUCCESS',
    requestId: requestContext.requestId,
    metadata: { action: 'account_status_changed', newStatus },
  });

  return updated;
}

/**
 * Serialize account — converts BigInt balancePaise to string for JSON.
 * JSON.stringify cannot handle BigInt natively.
 */
function serializeAccount(account) {
  if (!account) return null;
  return {
    ...account,
    balancePaise: account.balancePaise?.toString(),
    // Also provide rupees as a convenience field (not stored in DB)
    balanceRupees:
      account.balancePaise !== undefined
        ? (Number(account.balancePaise) / 100).toFixed(2)
        : undefined,
  };
}

module.exports = {
  createAccount,
  getOwnAccounts,
  getAccountById,
  getAllAccounts,
  updateAccountStatus,
  serializeAccount,
};
