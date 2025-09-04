CREATE TABLE "anamnesis_records" (
	"id" varchar PRIMARY KEY NOT NULL,
	"patient_id" varchar NOT NULL,
	"weight_kg" varchar,
	"notes" text,
	"goal" varchar,
	"activity_level" varchar,
	"liked_healthy_foods" jsonb DEFAULT '[]'::jsonb,
	"disliked_foods" jsonb DEFAULT '[]'::jsonb,
	"has_intolerance" boolean,
	"intolerances" jsonb DEFAULT '[]'::jsonb,
	"can_eat_morning_solids" boolean,
	"meals_per_day_current" integer,
	"meals_per_day_willing" integer,
	"alcohol_consumption" varchar,
	"supplements" text,
	"diseases" text,
	"medications" text,
	"biotype" varchar,
	"protocol_adherence" varchar,
	"next_protocol_requests" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "food_diary_entries" (
	"id" varchar PRIMARY KEY NOT NULL,
	"patient_id" varchar NOT NULL,
	"prescription_id" varchar NOT NULL,
	"meal_id" varchar NOT NULL,
	"image_url" text NOT NULL,
	"notes" text,
	"date" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mood_entries" DROP CONSTRAINT "mood_entries_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "mood_entries" DROP CONSTRAINT "mood_entries_prescription_id_prescriptions_id_fk";
--> statement-breakpoint
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "anamnesis_records" ADD CONSTRAINT "anamnesis_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
ALTER TABLE "mood_entries" ADD CONSTRAINT "mood_entries_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_entries" ADD CONSTRAINT "mood_entries_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;