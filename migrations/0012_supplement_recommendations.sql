-- Migração: Recomendações de Suplementos
-- Adiciona o campo supplement_recommendations na tabela de pacientes
-- para que o nutricionista possa inserir recomendações personalizadas de suplementação.

ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "supplement_recommendations" text;

COMMENT ON COLUMN "patients"."supplement_recommendations" IS
  'Recomendações de suplementação inseridas pelo nutricionista para o paciente.';
