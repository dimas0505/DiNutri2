CREATE TYPE "public"."plan_type" AS ENUM('free', 'monthly', 'quarterly');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'pending_payment', 'pending_approval', 'expired', 'canceled');--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"patient_id" varchar NOT NULL,
	"plan_type" "plan_type" NOT NULL,
	"status" "subscription_status" NOT NULL,
	"start_date" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"payment_link" text,
	"proof_of_payment_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;