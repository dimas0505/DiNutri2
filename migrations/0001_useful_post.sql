CREATE TABLE "mood_entries" (
	"id" varchar PRIMARY KEY NOT NULL,
	"patient_id" varchar NOT NULL,
	"prescription_id" varchar NOT NULL,
	"meal_id" varchar NOT NULL,
	"mood_before" varchar,
	"mood_after" varchar,
	"notes" text,
	"date" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "patients" DROP CONSTRAINT "patients_user_id_unique";--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "token" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "name" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "weight_kg" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "prescriptions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "hashed_password" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "email" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "role" varchar DEFAULT 'patient' NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "expires_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "used" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "goal" varchar;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "activity_level" varchar;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "liked_healthy_foods" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "disliked_foods" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "has_intolerance" boolean;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "intolerances" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "can_eat_morning_solids" boolean;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "meals_per_day_current" integer;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "meals_per_day_willing" integer;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "alcohol_consumption" varchar;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "supplements" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "diseases" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "medications" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "biotype" varchar;--> statement-breakpoint
ALTER TABLE "mood_entries" ADD CONSTRAINT "mood_entries_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_entries" ADD CONSTRAINT "mood_entries_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;