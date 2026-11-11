-- Run this as the postgres superuser to create the database and roles
-- Usage: psql -U postgres -f prisma/create-db.sql

-- Create the database
CREATE DATABASE balancevault;

-- Connect to it
\c balancevault

-- Create app role (used by running app -- DML only)
CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password_change_me';
GRANT CONNECT ON DATABASE balancevault TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- After migrations run, grant table access:
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- For local development, the postgres user is used directly (see .env)
-- In production, use the app_user role with limited permissions

SELECT 'Database balancevault created successfully' AS result;
