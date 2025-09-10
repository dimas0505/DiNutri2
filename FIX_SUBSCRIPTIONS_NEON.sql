-- ================================================
-- DiNutri2 - Fix Subscriptions Table for NeonDB
-- Copy and paste these commands one by one in Neon SQL Editor
-- ================================================

-- STEP 1: Check if subscriptions table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'subscriptions';

-- STEP 2: Check current expires_at column status
SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'expires_at';

-- STEP 3: If STEP 2 shows is_nullable = 'NO', run this command:
ALTER TABLE subscriptions ALTER COLUMN expires_at DROP NOT NULL;

-- STEP 4: Verify the fix worked
SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'expires_at';

-- STEP 5: Test creating a free subscription (should work without errors)
-- Replace 'your-patient-id' with an actual patient ID
-- INSERT INTO subscriptions (id, patient_id, plan_type, status, start_date, expires_at) VALUES ('test-' || gen_random_uuid(), 'your-patient-id', 'FREE', 'ACTIVE', NOW(), NULL);