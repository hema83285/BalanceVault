'use strict';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { cleanDatabase, createTestUser, createTestAdmin } = require('./helpers');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

afterEach(async () => {
  await cleanDatabase();
});

// ── Registration ─────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const validUser = {
    fullName: 'Test User',
    email: 'test@example.com',
    password: 'TestPass123',
  };

  it('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.role).toBe('ACCOUNT_HOLDER');
    // Password must NOT be in the response
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('always creates ACCOUNT_HOLDER role (cannot inject ADMIN)', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('ACCOUNT_HOLDER');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, email: 'notanemail' });
    expect(res.status).toBe(400);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      fullName: 'Test User', email: 'test@example.com', password: 'TestPass123',
    });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'TestPass123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'WrongPass123' });
    expect(res.status).toBe(401);
    // Generic message — does not reveal which field was wrong
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('rejects non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'TestPass123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });
});

// ── Current user ──────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns current user with valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      fullName: 'Me Test', email: 'me@example.com', password: 'TestPass123',
    });
    const token = reg.body.data.token;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@example.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });
});
