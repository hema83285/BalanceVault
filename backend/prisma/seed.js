/**
 * BalanceVault – First Admin Bootstrap Seed
 *
 * This script creates the first ADMIN user. It is NOT an API endpoint.
 * Run once after migrations:  node prisma/seed.js
 *
 * Required environment variables (set in .env or shell):
 *   ADMIN_EMAIL       – email address for the admin account
 *   ADMIN_PASSWORD    – password (min 8 chars); will be bcrypt-hashed
 *   ADMIN_FULL_NAME   – display name (optional, defaults to "System Admin")
 *
 * Security notes:
 *   - The /api/auth/register endpoint ALWAYS creates ACCOUNT_HOLDER role.
 *   - There is no public admin registration endpoint.
 *   - This script is the only legitimate way to create an ADMIN.
 *   - Never commit .env files. Use environment variables in CI/CD.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME || 'System Admin';

  // ── Validate required env vars ──────────────────────────────────────────────
  if (!email || !password) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment.');
    console.error('Example:');
    console.error('  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePass123 node prisma/seed.js');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('ERROR: ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('ERROR: ADMIN_EMAIL is not a valid email address.');
    process.exit(1);
  }

  // ── Check if admin already exists ───────────────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === 'ADMIN') {
      console.log(`Admin already exists with email: ${email}. No changes made.`);
      return;
    } else {
      console.error(`ERROR: A non-admin user already exists with email: ${email}`);
      console.error('Cannot promote existing users through this script. Use admin panel.');
      process.exit(1);
    }
  }

  // ── Hash password with bcrypt (12 rounds) ───────────────────────────────────
  const BCRYPT_ROUNDS = 12;
  console.log(`Hashing password with bcrypt (${BCRYPT_ROUNDS} rounds)...`);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // ── Create the admin user ────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
    },
  });

  // ── Write bootstrap audit record ─────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'USER_REGISTERED',
      targetType: 'User',
      targetId: admin.id,
      outcome: 'SUCCESS',
      metadata: {
        method: 'seed_script',
        note: 'First admin created via bootstrap seed',
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'ADMIN_ACTION',
      targetType: 'User',
      targetId: admin.id,
      outcome: 'SUCCESS',
      metadata: {
        action: 'admin_role_assigned',
        method: 'seed_script',
      },
    },
  });

  console.log('\n✅ Admin created successfully!');
  console.log('────────────────────────────────');
  console.log(`  ID:         ${admin.id}`);
  console.log(`  Email:      ${admin.email}`);
  console.log(`  Name:       ${admin.fullName}`);
  console.log(`  Role:       ${admin.role}`);
  console.log(`  Created At: ${admin.createdAt.toISOString()}`);
  console.log('────────────────────────────────');
  console.log('\nYou can now log in at /login with these credentials.');
  console.log('Keep these credentials secure and do not share them.\n');
}

main()
  .catch((err) => {
    console.error('Seed script failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
