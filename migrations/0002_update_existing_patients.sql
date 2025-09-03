-- Update existing patients to have proper default values for new anamnese fields
UPDATE "patients" 
SET 
  "liked_healthy_foods" = '[]'::jsonb 
WHERE "liked_healthy_foods" IS NULL;

UPDATE "patients" 
SET 
  "disliked_foods" = '[]'::jsonb 
WHERE "disliked_foods" IS NULL;

UPDATE "patients" 
SET 
  "intolerances" = '[]'::jsonb 
WHERE "intolerances" IS NULL;