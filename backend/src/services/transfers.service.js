/**
 * Transfers Service — Core financial operation
 *
 * This is the most security-critical service in BalanceVault.
 * Every validation step is intentional and documented.
 *
 * Transfer pipeline (all within a single PostgreSQL transaction):
 * 1. Rate limit check (middleware, before this service)
 * 2. Idempotency key check
 * 3. Load & lock sender account (SELECT FOR UPDATE)
 * 4. Verify sender ownership
 * 5. Verify sender ACTIVE
 * 6. Load receiver account
 * 7. Verify receiver ACTIVE
 * 8. Verify sender !== receiver
 * 9. Verify sufficient balance
 * 10. Deduct sender balance
 * 11. Add receiver balance
 * 12. Create Transaction record
 * 13. Create DEBIT LedgerEntry (sender)
 * 14. Create CREDIT LedgerEntry (receiver)
 * 15. Store idempotency record
 * 16. Write audit log (inside transaction)
 * COMMIT
 *
 * On ANY failure: ROLLBACK (all DB changes undone atomically)
 * After rollback: write TRANSFER_FAILED audit log (outside tx)
 */

'use strict';

const prisma = require('../config/database');
const {
  NotFoundError,
  AuthorizationError,
  AccountSuspendedError,
  InsufficientFundsError,
  ConflictError,
  ValidationError,
  IdempotencyError,
} = require('../utils/errors');
const { recordAudit } = require('./audit.service');
const { serializeAccount } = require('./accounts.service');
const logger = require('../utils/logger');

/**
 * Execute a money transfer.
 *
 * @param {string} senderUserId - Authenticated user's ID
 * @param {object} data - { receiverAccountId, amountPaise, note }
 * @param {string} idempotencyKey - From Idempotency-Key header
 * @param {object} requestContext - { requestId, ipAddress }
 */
async function executeTransfer(senderUserId, data, idempotencyKey, requestContext = {}) {
  if (!idempotencyKey) {
    throw new IdempotencyError();
  }

  const { receiverAccountId, amountPaise, note } = data;
  const amountBigInt = BigInt(amountPaise);

  // ── Step 2: Idempotency check (outside main transaction) ───────────────────
  const existingRecord = await prisma.idempotencyRecord.findUnique({
    where: { key: idempotencyKey },
  });

  if (existingRecord) {
    // Return cached response — idempotent replay
    logger.info({ idempotencyKey, requestId: requestContext.requestId }, 'Idempotent replay');
    return { idempotent: true, ...existingRecord.responseBody };
  }

  // ── Steps 3–16: Atomic database transaction ────────────────────────────────
  let transferResult;

  try {
    transferResult = await prisma.$transaction(
      async (tx) => {
        // Step 3: Load sender account with row-level lock
        // SELECT ... FOR UPDATE prevents concurrent transfers from the same account
        // from both reading the same (pre-deduction) balance
        const [senderRows] = await tx.$queryRaw`
          SELECT id, "user_id", account_number, balance_paise, status
          FROM accounts
          WHERE id = (
            SELECT id FROM accounts WHERE "user_id" = ${senderUserId} LIMIT 1
          )
          FOR UPDATE
        `;

        if (!senderRows) {
          throw new NotFoundError('Sender account');
        }

        const sender = senderRows;

        // Step 4: Verify sender ownership
        if (sender.user_id !== senderUserId) {
          throw new AuthorizationError('You do not own this account.');
        }

        // Step 5: Verify sender active
        if (sender.status !== 'ACTIVE') {
          throw new AccountSuspendedError();
        }

        // Step 6: Load receiver account (no lock needed — we only add to their balance)
        const receiver = await tx.account.findUnique({
          where: { id: receiverAccountId },
          select: { id: true, userId: true, accountNumber: true, balancePaise: true, status: true },
        });

        if (!receiver) {
          throw new NotFoundError('Receiver account');
        }

        // Step 7: Verify receiver active
        if (receiver.status !== 'ACTIVE') {
          throw new AccountSuspendedError();
        }

        // Step 8: Prevent self-transfer
        if (sender.id === receiver.id) {
          throw new ValidationError('Cannot transfer to the same account.');
        }

        const senderBalance = BigInt(sender.balance_paise);

        // Step 9: Sufficient balance check
        if (senderBalance < amountBigInt) {
          throw new InsufficientFundsError();
        }

        const newSenderBalance = senderBalance - amountBigInt;
        const newReceiverBalance = BigInt(receiver.balancePaise) + amountBigInt;

        // Step 10 & 11: Update both balances atomically
        await tx.$executeRaw`
          UPDATE accounts SET balance_paise = ${newSenderBalance}, updated_at = NOW()
          WHERE id = ${sender.id}
        `;

        await tx.$executeRaw`
          UPDATE accounts SET balance_paise = ${newReceiverBalance}, updated_at = NOW()
          WHERE id = ${receiver.id}
        `;

        // Step 12: Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            idempotencyKey,
            senderAccountId: sender.id,
            receiverAccountId: receiver.id,
            amountPaise: amountBigInt,
            status: 'COMPLETED',
            note: note || null,
            completedAt: new Date(),
          },
        });

        // Step 13: Create DEBIT ledger entry (sender)
        await tx.ledgerEntry.create({
          data: {
            transactionId: transaction.id,
            accountId: sender.id,
            type: 'DEBIT',
            amountPaise: amountBigInt,
            balanceAfterPaise: newSenderBalance,
          },
        });

        // Step 14: Create CREDIT ledger entry (receiver)
        await tx.ledgerEntry.create({
          data: {
            transactionId: transaction.id,
            accountId: receiver.id,
            type: 'CREDIT',
            amountPaise: amountBigInt,
            balanceAfterPaise: newReceiverBalance,
          },
        });

        // Step 15: Store idempotency record
        const ttlMs = parseInt(process.env.IDEMPOTENCY_TTL_HOURS || '24', 10) * 60 * 60 * 1000;
        const expiresAt = new Date(Date.now() + ttlMs);

        const responseBody = {
          id: transaction.id,
          idempotencyKey,
          senderAccountId: sender.id,
          receiverAccountId: receiver.id,
          amountPaise: amountPaise.toString(),
          amountRupees: (amountPaise / 100).toFixed(2),
          status: 'COMPLETED',
          note: note || null,
          completedAt: transaction.completedAt,
          createdAt: transaction.createdAt,
        };

        await tx.idempotencyRecord.create({
          data: {
            key: idempotencyKey,
            responseBody,
            statusCode: 201,
            expiresAt,
          },
        });

        // Step 16: Audit log (inside transaction — if tx fails, audit is also rolled back)
        await tx.auditLog.create({
          data: {
            actorId: senderUserId,
            action: 'TRANSFER_COMPLETED',
            targetType: 'Transaction',
            targetId: transaction.id,
            outcome: 'SUCCESS',
            requestId: requestContext.requestId || null,
            ipAddress: requestContext.ipAddress || null,
            metadata: {
              transactionId: transaction.id,
              senderAccountId: sender.id,
              receiverAccountId: receiver.id,
              amountPaise: amountPaise.toString(),
              idempotencyKey,
            },
          },
        });

        return responseBody;
      },
      {
        isolationLevel: 'Serializable', // Strongest isolation — prevents phantom reads
        timeout: 10000, // 10 second timeout
      }
    );
  } catch (err) {
    // Write failure audit OUTSIDE the rolled-back transaction
    await recordAudit({
      actorId: senderUserId,
      action: 'TRANSFER_FAILED',
      targetType: 'Account',
      targetId: null,
      outcome: 'FAILURE',
      requestId: requestContext.requestId,
      ipAddress: requestContext.ipAddress,
      metadata: {
        reason: err.message,
        code: err.code,
        receiverAccountId,
        amountPaise: amountPaise?.toString(),
        idempotencyKey,
      },
    });

    throw err; // Re-throw for error handler
  }

  return transferResult;
}

/**
 * Get own transfer history (paginated).
 * Returns transfers where the user is sender OR receiver.
 */
async function getOwnTransfers(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  // Get user's account IDs first
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  });

  const accountIds = accounts.map((a) => a.id);

  if (accountIds.length === 0) {
    return { items: [], pagination: { page, limit, total: 0, pages: 0 } };
  }

  const where = {
    OR: [
      { senderAccountId: { in: accountIds } },
      { receiverAccountId: { in: accountIds } },
    ],
  };

  const [items, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        senderAccount: { select: { id: true, accountNumber: true } },
        receiverAccount: { select: { id: true, accountNumber: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    items: items.map(serializeTransaction),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Get a single transfer by ID — enforces ownership.
 */
async function getTransferById(transactionId, userId) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      senderAccount: { select: { id: true, accountNumber: true } },
      receiverAccount: { select: { id: true, accountNumber: true } },
      ledgerEntries: true,
    },
  });

  if (!transaction) {
    throw new NotFoundError('Transaction');
  }

  // Ownership: user must be sender or receiver
  const isOwner =
    accountIds.includes(transaction.senderAccountId) ||
    accountIds.includes(transaction.receiverAccountId);

  if (!isOwner) {
    throw new AuthorizationError('You do not have access to this transaction.');
  }

  return serializeTransaction(transaction);
}

/**
 * Admin: Get all transactions with pagination and filters.
 */
async function getAllTransactions({ page = 1, limit = 20, status, accountId } = {}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(status && { status }),
    ...(accountId && {
      OR: [{ senderAccountId: accountId }, { receiverAccountId: accountId }],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        senderAccount: {
          include: { user: { select: { id: true, email: true, fullName: true } } },
        },
        receiverAccount: {
          include: { user: { select: { id: true, email: true, fullName: true } } },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    items: items.map(serializeTransaction),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Serialize transaction — BigInt amountPaise to string.
 */
function serializeTransaction(tx) {
  if (!tx) return null;
  return {
    ...tx,
    amountPaise: tx.amountPaise?.toString(),
    amountRupees: tx.amountPaise !== undefined
      ? (Number(tx.amountPaise) / 100).toFixed(2)
      : undefined,
    senderAccount: tx.senderAccount ? serializeAccount(tx.senderAccount) : undefined,
    receiverAccount: tx.receiverAccount ? serializeAccount(tx.receiverAccount) : undefined,
    ledgerEntries: tx.ledgerEntries?.map((e) => ({
      ...e,
      amountPaise: e.amountPaise?.toString(),
      balanceAfterPaise: e.balanceAfterPaise?.toString(),
    })),
  };
}

module.exports = {
  executeTransfer,
  getOwnTransfers,
  getTransferById,
  getAllTransactions,
  serializeTransaction,
};
