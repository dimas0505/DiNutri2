-- ===============================================
-- DiNutri2 - Add expires_at column to prescriptions table
-- Execute this script in the Neon SQL Editor to add expiration functionality
-- ===============================================

-- Add expires_at column to prescriptions table
ALTER TABLE prescriptions 
ADD COLUMN expires_at timestamp;

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'prescriptions' 
AND column_name = 'expires_at';

-- Show updated prescriptions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'prescriptions'
ORDER BY ordinal_position;