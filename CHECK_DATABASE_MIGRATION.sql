-- ================================================
-- DiNutri2 - Database Migration Fix
-- Execute these commands in the Neon SQL Editor
-- ================================================

-- STEP 1: Check if expires_at column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'prescriptions' AND column_name = 'expires_at';

-- STEP 2: If no results from STEP 1, add the column
-- (Only run this if STEP 1 returns no results)
ALTER TABLE prescriptions ADD COLUMN expires_at timestamp;

-- STEP 3: Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'prescriptions' AND column_name = 'expires_at';

-- STEP 4: Test that prescriptions can be updated (should work without errors)
-- This will not modify any data, just test the column exists
SELECT id, title, expires_at FROM prescriptions LIMIT 1;