# Database Schema Fix Instructions

## Problem
The application is experiencing errors because the database schema is not synchronized with the code:

1. **Patient Creation Error**: `column "goal" of relation "patients" does not exist`
2. **Invitation Creation Error**: `query.getSQL is not a function` (Fixed in code)

## Root Cause
The database hasn't been updated with the latest migrations that add the new anamnese fields to the `patients` table and the `email` column to the `invitations` table.

## Solution

### Step 1: Push Schema Changes to Database
Run the following command to synchronize your database with the current schema:

```bash
npm run db:push
```

Or if that doesn't work, use:

```bash
npx drizzle-kit push
```

### Step 2: Verify the Database Schema
After pushing, you can verify that the columns exist by checking your database directly or by testing the API endpoints.

### Step 3: Alternative Manual Migration (if push fails)
If the automatic push doesn't work, you can manually run these SQL commands in your database:

```sql
-- Add missing columns to patients table (if they don't exist)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "goal" varchar;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "activity_level" varchar;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "liked_healthy_foods" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "disliked_foods" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "has_intolerance" boolean;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "intolerances" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "can_eat_morning_solids" boolean;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "meals_per_day_current" integer;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "meals_per_day_willing" integer;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "alcohol_consumption" varchar;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "supplements" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "diseases" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "medications" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "biotype" varchar;

-- Add missing columns to invitations table (if they don't exist)
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "email" varchar NOT NULL DEFAULT 'placeholder@email.com';
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "role" varchar DEFAULT 'patient' NOT NULL;
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "expires_at" timestamp NOT NULL DEFAULT (NOW() + INTERVAL '7 days');
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "used" boolean DEFAULT false;

-- Update existing patients to have proper default values
UPDATE "patients" 
SET "liked_healthy_foods" = '[]'::jsonb 
WHERE "liked_healthy_foods" IS NULL;

UPDATE "patients" 
SET "disliked_foods" = '[]'::jsonb 
WHERE "disliked_foods" IS NULL;

UPDATE "patients" 
SET "intolerances" = '[]'::jsonb 
WHERE "intolerances" IS NULL;
```

## Code Changes Made
I've also fixed the `createInvitation` function in `server/storage.ts` to properly handle the Drizzle query building and made it more robust for both new and legacy database schemas.

## Testing
After applying the database changes, test the following API endpoints:
- `POST /api/patients` - Should work without "goal" column errors
- `POST /api/invitations` - Should work without query.getSQL errors

## Important Notes
- The code already has fallback mechanisms for legacy database schemas
- These changes are backward compatible
- All existing data will be preserved
- The fixes handle both the new schema and legacy schema gracefully