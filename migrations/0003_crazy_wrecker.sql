ALTER TABLE "patients" ADD COLUMN "status" varchar DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "expires_at" timestamp;