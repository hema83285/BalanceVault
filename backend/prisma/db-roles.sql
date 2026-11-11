-- BalanceVault – PostgreSQL Role Setup Script
-- Run this ONCE as a superuser (e.g., postgres) BEFORE running migrations.
-- This establishes the least-privilege role structure.
--
-- Usage:
--   psql -U postgres -d balancevault -f prisma/db-roles.sql
--
-- Three roles are created:
--   app_migrate : DDL + DML — used only during prisma migrate deploy
--   app_user    : DML only  — used by the running application
--   app_readonly: SELECT only — for read-only reporting / analytics

-- ── Create the database (skip if it already exists) ──────────────────────────
-- CREATE DATABASE balancevault;

-- ── Role: app_migrate (migration deployments only) ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_migrate') THEN
    CREATE ROLE app_migrate LOGIN PASSWORD 'CHANGE_THIS_MIGRATE_PASSWORD';
  END IF;
END $$;

GRANT ALL PRIVILEGES ON DATABASE balancevault TO app_migrate;
GRANT ALL ON SCHEMA public TO app_migrate;

-- ── Role: app_user (the running API server) ───────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'CHANGE_THIS_APP_PASSWORD';
  END IF;
END $$;

-- After migration runs (tables exist), grant DML permissions:
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Ensure future tables are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- ── Role: app_readonly (analytics / reporting — optional) ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_readonly') THEN
    CREATE ROLE app_readonly LOGIN PASSWORD 'CHANGE_THIS_READONLY_PASSWORD';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO app_readonly;

-- ── Security notes ────────────────────────────────────────────────────────────
-- app_user intentionally cannot:
--   - DROP TABLE / ALTER TABLE / TRUNCATE
--   - Access pg_catalog or information_schema directly
--   - DELETE from audit_logs (enforced by application, not DB role, but
--     the application never calls DELETE on audit_logs)
--
-- For managed PostgreSQL (Neon, Supabase, RDS):
--   These roles map to database users you create in the provider's dashboard.
--   The DATABASE_URL in .env should use app_user credentials.
--   The DATABASE_MIGRATE_URL should use app_migrate credentials.
