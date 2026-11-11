/**
 * Ledger Service
 * Provides read access to ledger entries and integrity verification.
 *
 * The ledger is append-only — no update/delete operations here.
 * Integrity check verifies:
 * 1. Every COMPLETED transaction has exactly 2 ledger entries (1 DEBIT + 1 CREDIT)
 * 2. Entry amounts match the transaction amount
 * 3. Each account's current balance equals sum of credits minus sum of debits
 */

'use strict';

const prisma = require('../config/database');
const { NotFoundError, AuthorizationError } = require('../utils/errors');

/**
 * Get ledger entries for the authenticated user's accounts.
 */
async function getOwnLedger(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);

  if (accountIds.length === 0) {
    return { items: [], pagination: { page, limit, total: 0, pages: 0 } };
  }

  const where = { accountId: { in: accountIds } };

  const [items, total, fundingItems, fundingTotal] = await prisma.$transaction([
    prisma.ledgerEntry.findMany({
      where,
      take: skip + limit,
      orderBy: { createdAt: 'desc' },
      include: {
        transaction: {
          select: { id: true, amountPaise: true, status: true, note: true, createdAt: true },
        },
        account: { select: { id: true, accountNumber: true } },
      },
    }),
    prisma.ledgerEntry.count({ where }),
    prisma.accountFunding.findMany({
      where: { accountId: { in: accountIds } },
      take: skip + limit,
      orderBy: { createdAt: 'desc' },
      include: {
        account: { select: { id: true, accountNumber: true } },
      },
    }),
    prisma.accountFunding.count({ where: { accountId: { in: accountIds } } }),
  ]);

  const combinedItems = [
    ...items.map(serializeLedgerEntry),
    ...fundingItems.map(serializeFundingEntry),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    items: combinedItems.slice(skip, skip + limit),
    pagination: { page, limit, total: total + fundingTotal, pages: Math.ceil((total + fundingTotal) / limit) },
  };
}

/**
 * Get ledger entries for a specific transaction — enforces ownership.
 */
async function getLedgerByTransaction(transactionId, userId) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);

  const entries = await prisma.ledgerEntry.findMany({
    where: { transactionId },
    include: {
      account: { select: { id: true, accountNumber: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (entries.length === 0) {
    throw new NotFoundError('Ledger entries for this transaction');
  }

  // Ownership: user must own at least one of the accounts in this transaction
  const hasAccess = entries.some((e) => accountIds.includes(e.accountId));
  if (!hasAccess) {
    throw new AuthorizationError('You do not have access to this transaction ledger.');
  }

  return entries.map(serializeLedgerEntry);
}

/**
 * Admin: Run full ledger integrity verification.
 * Returns a report of inconsistencies (empty array = healthy ledger).
 */
async function verifyLedgerIntegrity() {
  const inconsistencies = [];

  // ── Check 1: Every COMPLETED transaction has exactly 1 DEBIT + 1 CREDIT ────
  const transactions = await prisma.transaction.findMany({
    where: { status: 'COMPLETED' },
    include: { ledgerEntries: true },
  });

  for (const tx of transactions) {
    const debits = tx.ledgerEntries.filter((e) => e.type === 'DEBIT');
    const credits = tx.ledgerEntries.filter((e) => e.type === 'CREDIT');

    if (debits.length !== 1) {
      inconsistencies.push({
        type: 'MISSING_DEBIT',
        transactionId: tx.id,
        message: `Expected 1 DEBIT entry, found ${debits.length}`,
      });
    }

    if (credits.length !== 1) {
      inconsistencies.push({
        type: 'MISSING_CREDIT',
        transactionId: tx.id,
        message: `Expected 1 CREDIT entry, found ${credits.length}`,
      });
    }

    // Check amounts match
    if (debits.length === 1 && debits[0].amountPaise !== tx.amountPaise) {
      inconsistencies.push({
        type: 'AMOUNT_MISMATCH',
        transactionId: tx.id,
        entryId: debits[0].id,
        message: `DEBIT amount ${debits[0].amountPaise} does not match transaction amount ${tx.amountPaise}`,
      });
    }

    if (credits.length === 1 && credits[0].amountPaise !== tx.amountPaise) {
      inconsistencies.push({
        type: 'AMOUNT_MISMATCH',
        transactionId: tx.id,
        entryId: credits[0].id,
        message: `CREDIT amount ${credits[0].amountPaise} does not match transaction amount ${tx.amountPaise}`,
      });
    }

    // Check account IDs match
    if (debits.length === 1 && debits[0].accountId !== tx.senderAccountId) {
      inconsistencies.push({
        type: 'WRONG_ACCOUNT',
        transactionId: tx.id,
        message: `DEBIT entry accountId does not match senderAccountId`,
      });
    }

    if (credits.length === 1 && credits[0].accountId !== tx.receiverAccountId) {
      inconsistencies.push({
        type: 'WRONG_ACCOUNT',
        transactionId: tx.id,
        message: `CREDIT entry accountId does not match receiverAccountId`,
      });
    }
  }

  // ── Check 2: Account balance = initial (0) + credits - debits ──────────────
  const accounts = await prisma.account.findMany({
    select: { id: true, accountNumber: true, balancePaise: true },
  });

  for (const account of accounts) {
    const [entries, fundings] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: { accountId: account.id },
        select: { type: true, amountPaise: true },
      }),
      prisma.accountFunding.findMany({
        where: { accountId: account.id },
        select: { amountPaise: true },
      }),
    ]);

    const totalCredits = entries
      .filter((e) => e.type === 'CREDIT')
      .reduce((sum, e) => sum + e.amountPaise, BigInt(0)) +
      fundings.reduce((sum, funding) => sum + funding.amountPaise, BigInt(0));

    const totalDebits = entries
      .filter((e) => e.type === 'DEBIT')
      .reduce((sum, e) => sum + e.amountPaise, BigInt(0));

    const expectedBalance = totalCredits - totalDebits;

    if (expectedBalance !== account.balancePaise) {
      inconsistencies.push({
        type: 'BALANCE_MISMATCH',
        accountId: account.id,
        accountNumber: account.accountNumber,
        message: `Stored balance ${account.balancePaise} does not match ledger-computed balance ${expectedBalance}`,
        storedBalance: account.balancePaise.toString(),
        computedBalance: expectedBalance.toString(),
      });
    }
  }

  return {
    healthy: inconsistencies.length === 0,
    transactionsChecked: transactions.length,
    accountsChecked: accounts.length,
    inconsistencies: inconsistencies.map((i) => ({
      ...i,
      storedBalance: i.storedBalance || undefined,
      computedBalance: i.computedBalance || undefined,
    })),
    checkedAt: new Date().toISOString(),
  };
}

function serializeLedgerEntry(entry) {
  return {
    ...entry,
    amountPaise: entry.amountPaise?.toString(),
    balanceAfterPaise: entry.balanceAfterPaise?.toString(),
    transaction: entry.transaction
      ? {
          ...entry.transaction,
          amountPaise: entry.transaction.amountPaise?.toString(),
        }
      : undefined,
  };
}

function serializeFundingEntry(funding) {
  return {
    id: funding.id,
    type: 'CREDIT',
    entryType: 'DEMO_FUNDING',
    amountPaise: funding.amountPaise.toString(),
    balanceAfterPaise: funding.balanceAfterPaise.toString(),
    createdAt: funding.createdAt,
    transaction: null,
    account: funding.account,
  };
}

module.exports = { getOwnLedger, getLedgerByTransaction, verifyLedgerIntegrity };
