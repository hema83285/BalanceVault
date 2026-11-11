/**
 * Admin Service
 * Provides admin dashboard aggregates and user management.
 */

'use strict';

const prisma = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const { recordAudit } = require('./audit.service');

/**
 * Dashboard aggregate statistics.
 */
async function getDashboardStats() {
  const [
    totalUsers,
    activeAccounts,
    pendingOnboardings,
    totalTransactions,
    recentTransactions,
    recentAuditLogs,
  ] = await prisma.$transaction([
    prisma.user.count({ where: { role: 'ACCOUNT_HOLDER' } }),
    prisma.account.count({ where: { status: 'ACTIVE' } }),
    prisma.onboarding.count({ where: { status: 'PENDING' } }),
    prisma.transaction.count({ where: { status: 'COMPLETED' } }),
    prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: { status: 'COMPLETED' },
      include: {
        senderAccount: { select: { accountNumber: true } },
        receiverAccount: { select: { accountNumber: true } },
      },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, email: true, fullName: true, role: true } },
      },
    }),
  ]);

  // Total volume transferred (sum of completed transaction amounts)
  const volumeResult = await prisma.transaction.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amountPaise: true },
  });

  return {
    totalUsers,
    activeAccounts,
    pendingOnboardings,
    totalTransactions,
    totalVolumePaise: volumeResult._sum.amountPaise?.toString() || '0',
    totalVolumeRupees: volumeResult._sum.amountPaise
      ? (Number(volumeResult._sum.amountPaise) / 100).toFixed(2)
      : '0.00',
    recentTransactions: recentTransactions.map((tx) => ({
      ...tx,
      amountPaise: tx.amountPaise?.toString(),
      amountRupees: (Number(tx.amountPaise) / 100).toFixed(2),
    })),
    recentAuditLogs,
  };
}

/**
 * Get all users with pagination.
 */
async function getAllUsers({ page = 1, limit = 20, role, search } = {}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(role && { role }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        onboarding: { select: { status: true } },
        accounts: { select: { id: true, status: true, accountNumber: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Get paginated audit logs.
 */
async function getAuditLogs({ page = 1, limit = 20, action, actorId, outcome } = {}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(action && { action }),
    ...(actorId && { actorId }),
    ...(outcome && { outcome }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, email: true, fullName: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

module.exports = { getDashboardStats, getAllUsers, getAuditLogs };
