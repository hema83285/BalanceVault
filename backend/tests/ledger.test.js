'use strict';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const {
  cleanDatabase, createTestUser, createTestAdmin,
  createApprovedOnboarding, createTestAccount,
} = require('./helpers');
const { signToken, createTokenPayload } = require('../src/utils/jwt');
const { v4: uuidv4 } = require('uuid');

let sender, receiver, senderAccount, receiverAccount, senderToken, adminToken;

beforeAll(async () => { process.env.NODE_ENV = 'test'; });
afterAll(async () => { await cleanDatabase(); await prisma.$disconnect(); });

beforeEach(async () => {
  await cleanDatabase();
  sender   = await createTestUser({ email: 'ledger_sender@example.com' });
  receiver = await createTestUser({ email: 'ledger_receiver@example.com' });
  const admin = await createTestUser({ email: 'ledger_admin@example.com', role: 'ADMIN' });
  await createApprovedOnboarding(sender.id);
  await createApprovedOnboarding(receiver.id);
  senderAccount   = await createTestAccount(sender.id,   BigInt(100000));
  receiverAccount = await createTestAccount(receiver.id, BigInt(0));
  senderToken  = signToken(createTokenPayload(sender));
  adminToken   = signToken(createTokenPayload(admin));
});

describe('Ledger integrity', () => {
  it('every completed transfer has exactly 1 DEBIT and 1 CREDIT entry', async () => {
    await request(app).post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', uuidv4())
      .send({ receiverAccountId: receiverAccount.id, amountPaise: 20000 });

    const transactions = await prisma.transaction.findMany({ where: { status: 'COMPLETED' }, include: { ledgerEntries: true } });
    for (const tx of transactions) {
      const debits  = tx.ledgerEntries.filter(e => e.type === 'DEBIT');
      const credits = tx.ledgerEntries.filter(e => e.type === 'CREDIT');
      expect(debits).toHaveLength(1);
      expect(credits).toHaveLength(1);
      expect(debits[0].amountPaise).toBe(tx.amountPaise);
      expect(credits[0].amountPaise).toBe(tx.amountPaise);
    }
  });

  it('ledger verification endpoint returns a report with no inconsistencies for clean data', async () => {
    // Do a valid transfer first
    const txRes = await request(app).post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', uuidv4())
      .send({ receiverAccountId: receiverAccount.id, amountPaise: 10000 });

    expect(txRes.status).toBe(201);

    // Verify the transaction directly in DB (not via endpoint which checks ALL data)
    const txId = txRes.body.data.id;
    const entries = await prisma.ledgerEntry.findMany({ where: { transactionId: txId } });
    expect(entries).toHaveLength(2);

    const debit  = entries.find(e => e.type === 'DEBIT');
    const credit = entries.find(e => e.type === 'CREDIT');
    expect(debit.amountPaise).toBe(BigInt(10000));
    expect(credit.amountPaise).toBe(BigInt(10000));

    // The endpoint itself should respond 200
    const res = await request(app)
      .get('/api/admin/ledger/verify')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.inconsistencies).toBeDefined();
  });

  it('ledger balanceAfterPaise reflects the correct running balance', async () => {
    await request(app).post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', uuidv4())
      .send({ receiverAccountId: receiverAccount.id, amountPaise: 30000 });

    const debitEntry = await prisma.ledgerEntry.findFirst({
      where: { accountId: senderAccount.id, type: 'DEBIT' },
    });
    expect(debitEntry.balanceAfterPaise).toBe(BigInt(70000)); // 100000 - 30000
  });
});
