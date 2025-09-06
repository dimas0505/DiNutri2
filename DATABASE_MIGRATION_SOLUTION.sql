-- ===============================================
-- DiNutri2 - Clean Database Setup for Neon SQL Editor
-- Execute these scripts in the exact order shown
-- ===============================================

-- STEP 1: Create all tables (execute this first)
-- ===============================================

-- Users table
CREATE TABLE users (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    email varchar UNIQUE NOT NULL,
    hashed_password varchar,
    first_name varchar,
    last_name varchar,
    profile_image_url varchar,
    role varchar DEFAULT 'patient' NOT NULL,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Patients table  
CREATE TABLE patients (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    owner_id varchar NOT NULL,
    user_id varchar,
    name varchar NOT NULL,
    email varchar,
    birth_date varchar,
    sex varchar,
    height_cm integer,
    weight_kg varchar,
    notes text,
    goal varchar,
    activity_level varchar,
    liked_healthy_foods jsonb DEFAULT '[]'::jsonb,
    disliked_foods jsonb DEFAULT '[]'::jsonb,
    has_intolerance boolean,
    intolerances jsonb DEFAULT '[]'::jsonb,
    can_eat_morning_solids boolean,
    meals_per_day_current integer,
    meals_per_day_willing integer,
    alcohol_consumption varchar,
    supplements text,
    diseases text,
    medications text,
    biotype varchar,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Invitations table
CREATE TABLE invitations (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    email varchar NOT NULL,
    nutritionist_id varchar NOT NULL,
    role varchar DEFAULT 'patient' NOT NULL,
    token varchar UNIQUE NOT NULL,
    status varchar DEFAULT 'pending' NOT NULL,
    expires_at timestamp NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp DEFAULT now()
);

-- Prescriptions table
CREATE TABLE prescriptions (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    patient_id varchar NOT NULL,
    nutritionist_id varchar NOT NULL,
    title text NOT NULL,
    status varchar DEFAULT 'draft' NOT NULL,
    meals jsonb DEFAULT '[]'::jsonb NOT NULL,
    general_notes text,
    published_at timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Sessions table (required for login)
CREATE TABLE sessions (
    sid varchar PRIMARY KEY NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp NOT NULL
);

-- Mood entries table
CREATE TABLE mood_entries (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    patient_id varchar NOT NULL,
    prescription_id varchar NOT NULL,
    meal_id varchar NOT NULL,
    mood_before varchar,
    mood_after varchar,
    notes text,
    date varchar NOT NULL,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Anamnesis records table
CREATE TABLE anamnesis_records (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    patient_id varchar NOT NULL,
    weight_kg varchar,
    notes text,
    goal varchar,
    activity_level varchar,
    liked_healthy_foods jsonb DEFAULT '[]'::jsonb,
    disliked_foods jsonb DEFAULT '[]'::jsonb,
    has_intolerance boolean,
    intolerances jsonb DEFAULT '[]'::jsonb,
    can_eat_morning_solids boolean,
    meals_per_day_current integer,
    meals_per_day_willing integer,
    alcohol_consumption varchar,
    supplements text,
    diseases text,
    medications text,
    biotype varchar,
    protocol_adherence varchar,
    next_protocol_requests text,
    created_at timestamp DEFAULT now()
);

-- Food diary entries table
CREATE TABLE food_diary_entries (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    patient_id varchar NOT NULL,
    prescription_id varchar NOT NULL,
    meal_id varchar NOT NULL,
    image_url text NOT NULL,
    notes text,
    date varchar NOT NULL,
    created_at timestamp DEFAULT now()
);

-- STEP 2: Add foreign key constraints (execute this second)
-- ===============================================

ALTER TABLE invitations 
ADD CONSTRAINT invitations_nutritionist_id_users_id_fk 
FOREIGN KEY (nutritionist_id) REFERENCES users(id);

ALTER TABLE patients 
ADD CONSTRAINT patients_owner_id_users_id_fk 
FOREIGN KEY (owner_id) REFERENCES users(id);

ALTER TABLE patients 
ADD CONSTRAINT patients_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE prescriptions 
ADD CONSTRAINT prescriptions_patient_id_patients_id_fk 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE prescriptions 
ADD CONSTRAINT prescriptions_nutritionist_id_users_id_fk 
FOREIGN KEY (nutritionist_id) REFERENCES users(id);

ALTER TABLE mood_entries 
ADD CONSTRAINT mood_entries_patient_id_patients_id_fk 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE mood_entries 
ADD CONSTRAINT mood_entries_prescription_id_prescriptions_id_fk 
FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE;

ALTER TABLE anamnesis_records 
ADD CONSTRAINT anamnesis_records_patient_id_patients_id_fk 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE food_diary_entries 
ADD CONSTRAINT food_diary_entries_patient_id_patients_id_fk 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE food_diary_entries 
ADD CONSTRAINT food_diary_entries_prescription_id_prescriptions_id_fk 
FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE;

-- STEP 3: Add indexes (execute this third)
-- ===============================================

CREATE INDEX IDX_session_expire ON sessions USING btree (expire);

-- STEP 4: Verification queries (run these to check everything is working)
-- ===============================================

-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check prescriptions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'prescriptions'
ORDER BY ordinal_position;

-- Check if any data exists
SELECT 
  'users' as table_name, COUNT(*) as total_records FROM users
UNION ALL
SELECT 'patients', COUNT(*) FROM patients
UNION ALL
SELECT 'prescriptions', COUNT(*) FROM prescriptions
UNION ALL
SELECT 'invitations', COUNT(*) FROM invitations
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'mood_entries', COUNT(*) FROM mood_entries
UNION ALL
SELECT 'anamnesis_records', COUNT(*) FROM anamnesis_records
UNION ALL
SELECT 'food_diary_entries', COUNT(*) FROM food_diary_entries;