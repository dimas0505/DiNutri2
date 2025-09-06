ALTER TABLE "food_diary_entries" ALTER COLUMN "image_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "expires_at" timestamp;