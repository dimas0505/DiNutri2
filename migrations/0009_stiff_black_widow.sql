CREATE TABLE "anthropometric_assessments" (
	"id" varchar PRIMARY KEY NOT NULL,
	"patient_id" varchar NOT NULL,
	"nutritionist_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"circum_neck" real,
	"circum_chest" real,
	"circum_waist" real,
	"circum_abdomen" real,
	"circum_hip" real,
	"circum_non_dominant_arm_relaxed" real,
	"circum_non_dominant_arm_contracted" real,
	"circum_non_dominant_proximal_thigh" real,
	"circum_non_dominant_calf" real,
	"weight_kg" real,
	"fold_biceps" real,
	"fold_triceps" real,
	"fold_subscapular" real,
	"fold_suprailiac" real,
	"manual_body_fat_percent" real,
	"manual_body_fat_classification" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "in_app_notifications" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"body" text NOT NULL,
	"type" varchar DEFAULT 'general' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" varchar PRIMARY KEY NOT NULL,
	"nutritionist_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"title" varchar NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patient_documents" (
	"id" varchar PRIMARY KEY NOT NULL,
	"patient_id" varchar NOT NULL,
	"nutritionist_id" varchar NOT NULL,
	"file_name" varchar NOT NULL,
	"file_url" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan_type" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "anamnesis_records" ADD COLUMN "target_carb_percent" real;--> statement-breakpoint
ALTER TABLE "anamnesis_records" ADD COLUMN "target_protein_percent" real;--> statement-breakpoint
ALTER TABLE "anamnesis_records" ADD COLUMN "target_fat_percent" real;--> statement-breakpoint
ALTER TABLE "anamnesis_records" ADD COLUMN "target_carb_g" real;--> statement-breakpoint
ALTER TABLE "anamnesis_records" ADD COLUMN "target_protein_g" real;--> statement-breakpoint
ALTER TABLE "anamnesis_records" ADD COLUMN "target_fat_g" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "body_fat_equation" varchar DEFAULT 'siri';--> statement-breakpoint
ALTER TABLE "anthropometric_assessments" ADD CONSTRAINT "anthropometric_assessments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anthropometric_assessments" ADD CONSTRAINT "anthropometric_assessments_nutritionist_id_users_id_fk" FOREIGN KEY ("nutritionist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_nutritionist_id_users_id_fk" FOREIGN KEY ("nutritionist_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_nutritionist_id_users_id_fk" FOREIGN KEY ("nutritionist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_in_app_notifications_user" ON "in_app_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_notification_templates_nutritionist" ON "notification_templates" USING btree ("nutritionist_id");--> statement-breakpoint
CREATE INDEX "IDX_push_subscriptions_user" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
DROP TYPE "public"."plan_type";--> statement-breakpoint
DROP TYPE "public"."subscription_status";