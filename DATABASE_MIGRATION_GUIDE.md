# Database Migration Guide

## Problem
The application is experiencing errors when creating invitations because the database schema is missing required columns in the `invitations` table:
- `expires_at` (timestamp)
- `email` (varchar) 
- `role` (varchar)
- `used` (boolean)

## Solution
Apply the provided migration script to add the missing columns to your database.

## How to Apply the Migration

### Option 1: Using Neon SQL Editor (Recommended if using Neon)
1. Go to your Neon dashboard
2. Open the SQL Editor for your database
3. Copy and paste the contents of `migrations/0003_add_missing_invitation_columns.sql`
4. Execute the SQL commands

### Option 2: Using psql command line
```bash
# If you have DATABASE_URL environment variable set
psql "$DATABASE_URL" -f migrations/0003_add_missing_invitation_columns.sql

# Or connect directly
psql -h your-host -d your-database -U your-username -f migrations/0003_add_missing_invitation_columns.sql
```

### Option 3: Using a PostgreSQL client (pgAdmin, DBeaver, etc.)
1. Connect to your database using your preferred client
2. Open the migration file `migrations/0003_add_missing_invitation_columns.sql`
3. Execute the SQL commands

## Verification
After applying the migration, you can verify it worked by running:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invitations'
ORDER BY ordinal_position;
```

You should see the following columns:
- `id` (varchar)
- `nutritionist_id` (varchar)  
- `token` (varchar)
- `status` (varchar)
- `created_at` (timestamp)
- `expires_at` (timestamp) ← **New**
- `email` (varchar) ← **New**
- `role` (varchar) ← **New**
- `used` (boolean) ← **New**

## Code Changes
The application code has also been updated to:
1. **Handle legacy schema gracefully**: If the new columns don't exist, it falls back to using only the original columns
2. **Improved error handling**: Better detection of missing column errors
3. **Defensive programming**: Only uses columns that are guaranteed to exist in the legacy fallback

## Testing
After applying the migration:
1. Restart your application server
2. Try creating an invitation link in the nutritionist interface
3. The operation should now succeed and return a proper invitation token
4. Check the server logs - you should see "Invitation created successfully" instead of column errors

## Rollback (if needed)
If you need to rollback this migration for any reason:

```sql
-- Remove the new columns (this will lose data in these columns!)
ALTER TABLE "invitations" DROP COLUMN IF EXISTS "expires_at";
ALTER TABLE "invitations" DROP COLUMN IF EXISTS "email";  
ALTER TABLE "invitations" DROP COLUMN IF EXISTS "role";
ALTER TABLE "invitations" DROP COLUMN IF EXISTS "used";
```

**Warning**: Rolling back will delete any data in the new columns!