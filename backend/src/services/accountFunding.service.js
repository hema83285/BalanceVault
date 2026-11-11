'use strict';

const prisma = require('../config/database');
const {
  AccountSuspendedError,
  AuthorizationError,
  ConflictError,
  IdempotencyError,
  NotFoundError,
} = require('../utils/errors');

async function addDemoFunds(accountId, actorId, amountPaise, idempotencyKey, requestContext = {}) {
  if (process.env.NODE_ENV === 'production') {
    throw new AuthorizationError('Demo funding is disabled in production.');
  }

  if (!idempotencyKey) {
    throw new IdempotencyError();
  }

  const amount = BigInt(amountPaise);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.accountFunding.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      if (existing.accountId !== accountId || existing.amountPaise !== amount) {
        throw new ConflictError('Idempotency key was already used for a different funding request.');
      }

      return serializeFunding(existing, true);
    }

    const [account] = await tx.$queryRaw`
      SELECT id, balance_paise, status
      FROM accounts
      WHERE id = ${accountId}
      FOR UPDATE
    `;

    if (!account) {
      throw new NotFoundError('Account');
    }
    if (account.status !== 'ACTIVE') {
      throw new AccountSuspendedError();
    }

    const balanceAfterPaise = BigInt(account.balance_paise) + amount;
    await tx.account.update({
      where: { id: accountId },
      data: { balancePaise: balanceAfterPaise },
    });

    const funding = await tx.accountFunding.create({
      data: {
        idempotencyKey,
        accountId,
        actorId,
        amountPaise: amount,
        balanceAfterPaise,
        note: 'Development demo funds',
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ADMIN_ACTION',
        targetType: 'Account',
        targetId: accountId,
        outcome: 'SUCCESS',
        requestId: requestContext.requestId || null,
        ipAddress: requestContext.ipAddress || null,
        metadata: {
          action: 'demo_account_funding',
          fundingId: funding.id,
          amountPaise: amount.toString(),
          idempotencyKey,
        },
      },
    });

    return serializeFunding(funding, false);
  }, { isolationLevel: 'Serializable' });
}

function serializeFunding(funding, idempotent) {
  return {
    id: funding.id,
    accountId: funding.accountId,
    amountPaise: funding.amountPaise.toString(),
    balanceAfterPaise: funding.balanceAfterPaise.toString(),
    createdAt: funding.createdAt,
    idempotent,
  };
}

module.exports = { addDemoFunds };
