-- ================================================
-- DiNutri2 - Fix Subscriptions Table for NeonDB
-- SOLUTION FOR NEON SQL EDITOR EXPLAIN ISSUE
-- ================================================

-- PROBLEM: NeonDB SQL Editor adds EXPLAIN to queries automatically
-- SOLUTION: Use these alternative approaches

-- ================================================
-- OPTION 1: Check Database Connection
-- ================================================
-- First, verify you're connected to the correct database:
SELECT current_database(), current_schema()

-- Expected result should show your DiNutri2 database name

-- ================================================
-- OPTION 2: Check if ANY tables exist
-- ================================================
-- If this returns no results, the database is empty and needs migration:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'

-- ================================================
-- OPTION 3: If no tables exist, create subscriptions table manually
-- ================================================
-- Copy and paste this ENTIRE block as ONE command:

DO $$
BEGIN
    -- Create enums if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
        CREATE TYPE plan_type AS ENUM ('free', 'monthly', 'quarterly');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('active', 'pending_payment', 'pending_approval', 'expired', 'canceled');
    END IF;

    -- Create subscriptions table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        CREATE TABLE subscriptions (
            id VARCHAR PRIMARY KEY,
            patient_id VARCHAR NOT NULL,
            plan_type plan_type NOT NULL,
            status subscription_status NOT NULL,
            start_date TIMESTAMP NOT NULL,
            expires_at TIMESTAMP NULL,
            payment_link TEXT,
            proof_of_payment_url TEXT,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
    END IF;
END $$;

-- ================================================
-- OPTION 4: If table exists but expires_at is NOT NULL
-- ================================================
-- Use this workaround for the EXPLAIN issue:

DO $$
BEGIN
    -- Check and fix expires_at column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'expires_at' 
        AND is_nullable = 'NO'
    ) THEN
        EXECUTE 'ALTER TABLE subscriptions ALTER COLUMN expires_at DROP NOT NULL';
    END IF;
END $$;

-- ================================================
-- VERIFICATION COMMANDS
-- ================================================
-- Test 1: Check if table exists and column is nullable
SELECT 
    t.table_name,
    c.column_name,
    c.is_nullable,
    c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_name = 'subscriptions' AND c.column_name = 'expires_at'

-- Test 2: Check if enums exist
SELECT typname FROM pg_type WHERE typname IN ('plan_type', 'subscription_status')

-- ================================================
-- ALTERNATIVE: Use CLI instead of SQL Editor
-- ================================================
-- If SQL Editor continues to have issues, ask your developer to run:
-- npm run db:push
-- This will apply all pending migrations automatically