-- Adiciona campos de percentual de gordura corporal e classificação preenchidos manualmente
-- pelo nutricionista. Quando preenchidos, esses valores substituem o cálculo automático
-- (Durnin & Womersley) na visão do paciente. Os campos de dobras cutâneas e o cálculo
-- automático permanecem intactos para uso futuro.

ALTER TABLE "anthropometric_assessments"
  ADD COLUMN IF NOT EXISTS "manual_body_fat_percent" real,
  ADD COLUMN IF NOT EXISTS "manual_body_fat_classification" varchar;
