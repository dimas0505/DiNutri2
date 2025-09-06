-- Check if expires_at column exists in prescriptions table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'prescriptions' AND column_name = 'expires_at';

-- If the above query returns no results, run this command:
-- ALTER TABLE prescriptions ADD COLUMN expires_at timestamp;