'use strict';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { cleanDatabase, createTestUser, createTestAdmin, createTestAccount } = require('./helpers');
const { signToken, createTokenPayload } = require('../src/utils/jwt');
const ledgerService = require('../src/services/ledger.service');
const accountFundingService = require('../src/services/accountFunding.service');

let admin;
let user;
let account;
let adminToken;
let userToken;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanDatabase();
  admin = await createTestAdmin();
  user = await createTestUser();
  account = await createTestAccount(user.id, BigInt(0));
  adminToken = signToken(createTokenPayload(admin));
  userToken = signToken(createTokenPayload(user));
});

describe('POST /api/admin/accounts/:id/demo-credit', () => {
  it('credits an active account once and writes audit and funding records', async () => {
    const key = 'demo-credit-test-1';
    const res = await request(app)
      .post(`/api/admin/accounts/${account.id}/demo-credit`)
      .set('Authorization', 'Bearer ' + adminToken)
      .set('Idempotency-Key', key)
      .send({ amountPaise: '123400' });

    expect(res.status).toBe(201);
    expect(res.body.data.funding.amountPaise).toBe('123400');
    expect(res.body.data.funding.balanceAfterPaise).toBe('123400');
    expect((await prisma.account.findUnique({ where: { id: account.id } })).balancePaise).toBe(BigInt(123400));
    expect(await prisma.accountFunding.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { targetId: account.id, action: 'ADMIN_ACTION' } })).toBe(1);
    expect((await ledgerService.verifyLedgerIntegrity()).healthy).toBe(true);

    const ledger = await ledgerService.getOwnLedger(user.id);
    expect(ledger.items[0].entryType).toBe('DEMO_FUNDING');
    expect(ledger.items[0].amountPaise).toBe('123400');

    const replay = await request(app)
      .post(`/api/admin/accounts/${account.id}/demo-credit`)
      .set('Authorization', 'Bearer ' + adminToken)
      .set('Idempotency-Key', key)
      .send({ amountPaise: '123400' });

    expect(replay.status).toBe(200);
    expect(replay.body.data.funding.idempotent).toBe(true);
    expect(await prisma.accountFunding.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it('rejects account-holder access', async () => {
    const res = await request(app)
      .post(`/api/admin/accounts/${account.id}/demo-credit`)
      .set('Authorization', 'Bearer ' + userToken)
      .set('Idempotency-Key', 'demo-credit-forbidden')
      .send({ amountPaise: '100' });

    expect(res.status).toBe(403);
  });

  it('rejects missing idempotency keys and invalid amounts', async () => {
    const missingKey = await request(app)
      .post(`/api/admin/accounts/${account.id}/demo-credit`)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ amountPaise: '100' });
    const invalidAmount = await request(app)
      .post(`/api/admin/accounts/${account.id}/demo-credit`)
      .set('Authorization', 'Bearer ' + adminToken)
      .set('Idempotency-Key', 'demo-credit-invalid')
      .send({ amountPaise: '0' });

    expect(missingKey.status).toBe(400);
    expect(invalidAmount.status).toBe(400);
    expect((await prisma.account.findUnique({ where: { id: account.id } })).balancePaise).toBe(BigInt(0));
  });

  it('disables demo funding in production', async () => {
    const previousEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(
        accountFundingService.addDemoFunds(account.id, admin.id, '100', 'demo-credit-production')
      ).rejects.toMatchObject({ statusCode: 403 });
    } finally {
      process.env.NODE_ENV = previousEnvironment;
    }

    expect((await prisma.account.findUnique({ where: { id: account.id } })).balancePaise).toBe(BigInt(0));
  });
});
