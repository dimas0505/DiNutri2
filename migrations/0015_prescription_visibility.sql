-- Migração: controle manual de visibilidade da prescrição para o paciente
-- Regra: nutricionista sempre enxerga todas as prescrições; paciente enxerga apenas as visíveis.

ALTER TABLE "prescriptions"
  ADD COLUMN IF NOT EXISTS "is_visible_to_patient" boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN "prescriptions"."is_visible_to_patient" IS
  'Controla se a prescrição deve ficar visível para o paciente. true=visível, false=oculta.';
