'use strict';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { cleanDatabase, createTestUser, createTestAdmin, createApprovedOnboarding, createTestAccount } = require('./helpers');
const { signToken, createTokenPayload } = require('../src/utils/jwt');

let userToken, adminToken, user, admin;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanDatabase();
  user  = await createTestUser();
  admin = await createTestAdmin();
  userToken  = signToken(createTokenPayload(user));
  adminToken = signToken(createTokenPayload(admin));
});

// ── ACCOUNT HOLDER cannot access admin APIs ───────────────────────────────────

describe('RBAC: account holder cannot access admin routes', () => {
  it('GET /api/admin/dashboard → 403', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/users → 403', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/audit-logs → 403', async () => {
    const res = await request(app).get('/api/admin/audit-logs').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('PATCH /api/admin/onboarding/:id → 403', async () => {
    const res = await request(app).patch('/api/admin/onboarding/fakeid').set('Authorization', `Bearer ${userToken}`).send({ status: 'APPROVED' });
    expect(res.status).toBe(403);
  });
});

// ── ACCOUNT HOLDER cannot access another user's account ──────────────────────

describe('RBAC: account holder cannot access another user\'s account', () => {
  it('returns 403 when accessing another user\'s account', async () => {
    // Create another user with an account
    const otherUser = await createTestUser({ email: 'other@example.com' });
    await createApprovedOnboarding(otherUser.id);
    const otherAccount = await createTestAccount(otherUser.id);

    const res = await request(app).get(`/api/accounts/${otherAccount.id}`).set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

// ── ADMIN can access admin routes ─────────────────────────────────────────────

describe('RBAC: admin can access admin routes', () => {
  it('GET /api/admin/dashboard → 200', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/admin/users → 200', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/admin/audit-logs → 200', async () => {
    const res = await request(app).get('/api/admin/audit-logs').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ── Unauthenticated requests ──────────────────────────────────────────────────

describe('RBAC: unauthenticated access', () => {
  it('protected routes return 401 without token', async () => {
    const routes = ['/api/accounts', '/api/transfers', '/api/admin/dashboard', '/api/ledger'];
    for (const route of routes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    }
  });
});
