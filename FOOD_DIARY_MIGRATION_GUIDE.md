# Food Diary Migration Guide

## Overview
This migration adds the `food_diary_entries` table to support the new "Diário Alimentar por Foto" (Food Diary by Photo) functionality.

## Migration Details
**Migration File:** `migrations/0002_sweet_hercules.sql`
**Generated on:** 2025-09-04T15:22:42.319Z

## What's Being Added

### New Table: `food_diary_entries`
This table stores metadata about food photos uploaded by patients:

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar | Primary key, auto-generated |
| `patient_id` | varchar | Foreign key to patients table |
| `prescription_id` | varchar | Foreign key to prescriptions table |
| `meal_id` | varchar | ID of the meal within the prescription |
| `image_url` | text | URL of the uploaded image (Vercel Blob) |
| `notes` | text | Optional notes from the patient |
| `date` | varchar | Date of the meal (YYYY-MM-DD format) |
| `created_at` | timestamp | Auto-generated creation timestamp |

### Relationships
- **Patient relationship**: Each entry belongs to a patient (CASCADE DELETE)
- **Prescription relationship**: Each entry belongs to a prescription (CASCADE DELETE)

## How to Apply the Migration

### Prerequisites
1. **Vercel Blob Setup**: Before deploying, ensure you have:
   - Created a Blob Store in your Vercel dashboard
   - Connected it to your project
   - The `BLOB_READ_WRITE_TOKEN` environment variable is set

### Option 1: Using Drizzle Push (Recommended for Development)
```bash
npm run db:push
```

### Option 2: Using Neon SQL Editor
1. Go to your Neon dashboard
2. Open the SQL Editor for your database
3. Copy and paste the contents of `migrations/0002_sweet_hercules.sql`
4. Execute the SQL commands

### Option 3: Using psql command line
```bash
# If you have DATABASE_URL environment variable set
psql "$DATABASE_URL" -f migrations/0002_sweet_hercules.sql

# Or connect directly
psql -h your-host -d your-database -U your-username -f migrations/0002_sweet_hercules.sql
```

### Option 4: Using a PostgreSQL client (pgAdmin, DBeaver, etc.)
1. Connect to your database using your preferred client
2. Open the migration file `migrations/0002_sweet_hercules.sql`
3. Execute the SQL commands

## Verification
After applying the migration, verify it worked by running:

```sql
-- Check that the table was created
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'food_diary_entries'
ORDER BY ordinal_position;
```

You should see the following columns:
- `id` (varchar, NOT NULL)
- `patient_id` (varchar, NOT NULL)
- `prescription_id` (varchar, NOT NULL)
- `meal_id` (varchar, NOT NULL)
- `image_url` (text, NOT NULL)
- `notes` (text, nullable)
- `date` (varchar, NOT NULL)
- `created_at` (timestamp, with default)

## Testing the Functionality
After applying the migration:
1. Restart your application server
2. Log in as a patient with an active prescription
3. Navigate to a meal in the prescription
4. Click "Foto para o diário alimentar" button
5. The modal should open allowing photo upload
6. Upload a test image and add notes
7. Check the database to verify the entry was created

## Environment Variables Required
Make sure these environment variables are set in production:
- `DATABASE_URL` - Your PostgreSQL connection string
- `BLOB_READ_WRITE_TOKEN` - Your Vercel Blob access token

## Rollback (if needed)
If you need to rollback this migration:

```sql
-- Remove the new table (this will lose all food diary data!)
DROP TABLE IF EXISTS "food_diary_entries";

-- Note: This migration also includes other table modifications
-- A full rollback would require more complex operations
```

**Warning**: Rolling back will delete all food diary photo entries!

## Support
If you encounter issues during migration:
1. Check that all environment variables are properly set
2. Verify database connectivity
3. Ensure the database user has CREATE TABLE permissions
4. Check server logs for specific error messages