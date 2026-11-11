'use strict';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const {
  cleanDatabase, createTestUser, createApprovedOnboarding, createTestAccount,
} = require('./helpers');
const { signToken, createTokenPayload } = require('../src/utils/jwt');
const { v4: uuidv4 } = require('uuid');

let sender, receiver, senderAccount, receiverAccount, senderToken;

beforeAll(async () => { process.env.NODE_ENV = 'test'; });
afterAll(async () => { await cleanDatabase(); await prisma.$disconnect(); });

beforeEach(async () => {
  await cleanDatabase();
  sender   = await createTestUser({ email: 'sender@example.com' });
  receiver = await createTestUser({ email: 'receiver@example.com' });
  await createApprovedOnboarding(sender.id);
  await createApprovedOnboarding(receiver.id);
  senderAccount   = await createTestAccount(sender.id,   BigInt(50000)); // ₹500
  receiverAccount = await createTestAccount(receiver.id, BigInt(10000)); // ₹100
  senderToken = signToken(createTokenPayload(sender));
});

function transfer(data, key = uuidv4()) {
  return request(app).post('/api/transfers')
    .set('Authorization', `Bearer ${senderToken}`)
    .set('Idempotency-Key', key)
    .send(data);
}

// ── Valid transfer ────────────────────────────────────────────────────────────

describe('POST /api/transfers - valid transfer', () => {
  it('completes a valid transfer and creates ledger entries', async () => {
    const res = await transfer({ receiverAccountId: receiverAccount.id, amountPaise: 10000 });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('COMPLETED');

    // Check balances updated
    const updatedSender   = await prisma.account.findUnique({ where: { id: senderAccount.id } });
    const updatedReceiver = await prisma.account.findUnique({ where: { id: receiverAccount.id } });
    expect(updatedSender.balancePaise).toBe(BigInt(40000));   // 50000 - 10000
    expect(updatedReceiver.balancePaise).toBe(BigInt(20000)); // 10000 + 10000

    // Check ledger entries
    const entries = await prisma.ledgerEntry.findMany({ where: { transactionId: res.body.data.id } });
    expect(entries).toHaveLength(2);
    const debit  = entries.find(e => e.type === 'DEBIT');
    const credit = entries.find(e => e.type === 'CREDIT');
    expect(debit).toBeDefined();
    expect(credit).toBeDefined();
    expect(debit.amountPaise).toBe(BigInt(10000));
    expect(credit.amountPaise).toBe(BigInt(10000));
  });

  it('serializes nested account balances in the admin transaction list', async () => {
    const res = await transfer({ receiverAccountId: receiverAccount.id, amountPaise: 10000 });
    expect(res.status).toBe(201);

    const transfersService = require('../src/services/transfers.service');
    const result = await transfersService.getAllTransactions();

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(result.items[0].senderAccount.balancePaise).toBe('40000');
    expect(result.items[0].receiverAccount.balancePaise).toBe('20000');
  });
});

// ── Insufficient balance ──────────────────────────────────────────────────────

describe('POST /api/transfers - insufficient balance', () => {
  it('rejects transfer exceeding balance', async () => {
    const res = await transfer({ receiverAccountId: receiverAccount.id, amountPaise: 100000 }); // ₹1000 > ₹500
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_FUNDS');

    // Balances must be unchanged
    const s = await prisma.account.findUnique({ where: { id: senderAccount.id } });
    expect(s.balancePaise).toBe(BigInt(50000));
  });
});

// ── Invalid amounts ───────────────────────────────────────────────────────────

describe('POST /api/transfers - invalid amounts', () => {
  it('rejects negative amount', async () => {
    const res = await transfer({ receiverAccountId: receiverAccount.id, amountPaise: -500 });
    expect(res.status).toBe(400);
  });

  it('rejects zero amount', async () => {
    const res = await transfer({ receiverAccountId: receiverAccount.id, amountPaise: 0 });
    expect(res.status).toBe(400);
  });
});

// ── Self-transfer ─────────────────────────────────────────────────────────────

describe('POST /api/transfers - self transfer', () => {
  it('rejects transfer to own account', async () => {
    const res = await transfer({ receiverAccountId: senderAccount.id, amountPaise: 1000 });
    expect([400, 422]).toContain(res.status);
  });
});

// ── Idempotency ───────────────────────────────────────────────────────────────

describe('POST /api/transfers - idempotency', () => {
  it('replays the same response for duplicate idempotency key', async () => {
    const key = uuidv4();
    const first  = await transfer({ receiverAccountId: receiverAccount.id, amountPaise: 5000 }, key);
    const second = await transfer({ receiverAccountId: receiverAccount.id, amountPaise: 5000 }, key);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200); // idempotent replay
    expect(second.body.data.id).toBe(first.body.data.id);

    // Balance only changed once
    const s = await prisma.account.findUnique({ where: { id: senderAccount.id } });
    expect(s.balancePaise).toBe(BigInt(45000)); // 50000 - 5000, NOT 40000
  });

  it('requires Idempotency-Key header', async () => {
    const res = await request(app).post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ receiverAccountId: receiverAccount.id, amountPaise: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });
});

// ── Suspended account ─────────────────────────────────────────────────────────

describe('POST /api/transfers - suspended account', () => {
  it('rejects transfer from suspended sender account', async () => {
    await prisma.account.update({ where: { id: senderAccount.id }, data: { status: 'SUSPENDED' } });
    const res = await transfer({ receiverAccountId: receiverAccount.id, amountPaise: 1000 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ACCOUNT_NOT_ACTIVE');
  });
});
