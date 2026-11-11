# BalanceVault

**Secure Account Management & Auditable Money Movement Platform**

Snovasys Fresher Hiring Challenge 2026 — Full-stack financial platform built with Node.js, Express, Prisma, PostgreSQL, and React.

---

## Architecture

```
frontend/   React + Vite (Vercel)
backend/    Node.js + Express + Prisma (Render)
            └── PostgreSQL (Neon)
            └── Redis (Upstash)
```

---

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL 16 (running locally or Neon URL)
- Redis (optional for dev, required for prod)

### 1. Clone and install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment variables

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your database URL, JWT secret, etc.
```

Required variables in `backend/.env`:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/balancevault
JWT_SECRET=at-least-64-random-characters
```

### 3. Create the database (local PostgreSQL)

```bash
# As postgres superuser:
psql -U postgres -c "CREATE DATABASE balancevault;"
```

### 4. Generate Prisma client

```bash
cd backend
npm run db:generate
```

### 5. Run migrations

```bash
cd backend
npm run db:migrate
```

For a database that already had the application schema before migration history was added, baseline it once before deploying migrations:

```bash
npx prisma migrate resolve --applied 0_init
npm run db:migrate
```

Do not baseline a new or empty database; `npm run db:migrate` creates its schema.

### 6. Create the first admin

```bash
cd backend
# Set env vars first (or they'll be read from .env)
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePass123! node prisma/seed.js
```

Use the same `ADMIN_EMAIL` and `ADMIN_PASSWORD` when signing in. The seed script creates an admin only if that email is not already registered; it does not change an existing account's password.

### 7. Start the backend

```bash
cd backend
npm run dev        # development (with --watch)
# or
npm start          # production
```

### 8. Start the frontend

```bash
cd frontend
npm run dev
```

### 9. Run automated tests

```bash
cd backend
npm test
```

---

## API Documentation

Base URL: `http://localhost:5000`

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | None | Register new user |
| POST | /api/auth/login | None | Login, returns JWT |
| POST | /api/auth/logout | Bearer | Logout |
| GET | /api/auth/me | Bearer | Current user |

### Onboarding

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/onboarding | AH | Submit onboarding |
| GET | /api/onboarding/status | AH | Own status |
| GET | /api/admin/onboarding | Admin | All applications |
| PATCH | /api/admin/onboarding/:id | Admin | Approve/Reject |

### Accounts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/accounts | AH | Create account |
| GET | /api/accounts | AH | Own accounts |
| GET | /api/accounts/:id | AH | Account detail |
| GET | /api/admin/accounts | Admin | All accounts |
| PATCH | /api/admin/accounts/:id/status | Admin | Activate/Suspend |

### Transfers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/transfers | AH | Initiate transfer* |
| GET | /api/transfers | AH | Own transfers |
| GET | /api/transfers/:id | AH | Transfer detail |

*Requires `Idempotency-Key` header

### Ledger

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/ledger | AH | Own ledger |
| GET | /api/ledger/:transactionId | AH | Transaction ledger |
| GET | /api/admin/ledger/verify | Admin | Integrity check |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/admin/dashboard | Admin | Stats |
| GET | /api/admin/users | Admin | All users |
| GET | /api/admin/transactions | Admin | All transactions |
| GET | /api/admin/audit-logs | Admin | Audit logs |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | None | Liveness |
| GET | /ready | None | Readiness (DB+Redis) |

---

## Security Design

### Authentication
- JWT tokens (HS256, 24h expiry)
- bcrypt password hashing (12 rounds)
- Token payload never includes sensitive data
- Every authenticated request re-validates user from DB (checks isActive)

### Authorization (RBAC)
- Server-side role enforcement on every route
- Frontend guards are UX only — not security
- Users can NEVER access another user's resources
- Role field is hardcoded on registration (never accepted from request body)

### Financial Security
- All amounts stored as integer paise (BigInt) — no floating-point arithmetic
- `SELECT ... FOR UPDATE` row-level locking prevents concurrent overdraft
- Full PostgreSQL transaction for every transfer (Serializable isolation)
- Idempotency keys prevent duplicate transfers on retry
- Atomic rollback on any failure — ledger is never partially written
- Ledger verification endpoint catches inconsistencies

### Audit Trail
- Every sensitive action recorded in `audit_logs`
- Passwords, tokens, and secrets never logged
- Audit logs are append-only through the application API
- Only admins can read audit logs

### Database Roles
- `app_user` — DML only (SELECT, INSERT, UPDATE) — used by running app
- `app_migrate` — DDL + DML — used only during `prisma migrate deploy`
- `app_readonly` — SELECT only — optional reporting role
- Running app never has `DROP TABLE` or `ALTER TABLE` privileges

---

## Database Schema

| Model | Description |
|-------|-------------|
| User | Account holders and admins |
| Onboarding | KYC application (PENDING/APPROVED/REJECTED) |
| Account | Financial account with BigInt balance |
| Transaction | Money transfer record |
| LedgerEntry | Double-entry bookkeeping (DEBIT/CREDIT) |
| AuditLog | Append-only action history |
| IdempotencyRecord | Deduplication for transfers |

---

## Deployment

### Frontend (Vercel)
```bash
cd frontend
# Set VITE_API_URL=https://your-backend.onrender.com in Vercel env vars
vercel --prod
```

### Backend (Render)
1. Connect GitHub repo
2. Set environment variables in Render dashboard
3. Build command: `npm install && npm run db:generate && npm run db:migrate`
4. Start command: `npm start`

### Database (Neon PostgreSQL)
1. Create project at neon.tech
2. Copy connection string to `DATABASE_URL`
3. Run seed: `node prisma/seed.js`

### Redis (Upstash)
1. Create Redis database at upstash.com
2. Copy Redis URL to `REDIS_URL`

---

## Development Notes

- Never commit `.env` files
- In development only, admins can add demo funds to an active account from Account Management. Demo credits are recorded separately and included in the account ledger integrity check.
- Use `.env.example` as template
- Test database uses `TEST_DATABASE_URL` env var
- Rate limiting is disabled in test environment
- BigInt values are serialized as strings in JSON responses (`balancePaise`, `amountPaise`)
- `balanceRupees` is a computed convenience field (not stored in DB)
