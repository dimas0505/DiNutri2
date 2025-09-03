-- Migration to add missing columns to invitations table
-- This addresses the "column does not exist" errors

-- Add expires_at column (timestamp, NOT NULL)
ALTER TABLE "invitations" 
ADD COLUMN IF NOT EXISTS "expires_at" timestamp;

-- Add email column (varchar, NOT NULL) 
ALTER TABLE "invitations" 
ADD COLUMN IF NOT EXISTS "email" varchar;

-- Add role column (varchar with default)
ALTER TABLE "invitations" 
ADD COLUMN IF NOT EXISTS "role" varchar DEFAULT 'patient';

-- Add used column (boolean with default)
ALTER TABLE "invitations" 
ADD COLUMN IF NOT EXISTS "used" boolean DEFAULT false;

-- Update existing records to have valid values for new columns
-- Set expires_at to 7 days from creation date for existing records
UPDATE "invitations" 
SET "expires_at" = "created_at" + INTERVAL '7 days'
WHERE "expires_at" IS NULL;

-- Set email to a placeholder for existing records  
UPDATE "invitations" 
SET "email" = 'placeholder@temp.com'
WHERE "email" IS NULL;

-- Now make the columns NOT NULL after setting default values
ALTER TABLE "invitations" 
ALTER COLUMN "expires_at" SET NOT NULL;

ALTER TABLE "invitations" 
ALTER COLUMN "email" SET NOT NULL;

ALTER TABLE "invitations" 
ALTER COLUMN "role" SET NOT NULL;