-- Migração: Fluxo de Ativação de Plano Alimentar
-- Adiciona o status "preparing" (Plano em Preparação) e o campo startDate
-- para suportar o novo fluxo: preparing → active (com startDate e expiresAt calculados).

-- 1. Adicionar o campo startDate na tabela de prescrições
ALTER TABLE "prescriptions"
  ADD COLUMN IF NOT EXISTS "start_date" timestamp;

-- 2. Alterar o tipo da coluna status para aceitar o novo valor "preparing".
--    O PostgreSQL não permite ALTER COLUMN em enums inline de varchar diretamente,
--    mas como o campo é varchar com CHECK implícito do Drizzle (sem constraint nomeada),
--    podemos simplesmente garantir que o valor "preparing" seja aceito.
--    O Drizzle ORM valida o enum no nível da aplicação; no banco é apenas varchar.
--    Nenhuma alteração de constraint é necessária para varchar com enum no Drizzle.

-- 3. (Opcional) Comentário de documentação
COMMENT ON COLUMN "prescriptions"."start_date" IS
  'Data de início do plano alimentar, preenchida automaticamente ao ativar o plano.';
COMMENT ON COLUMN "prescriptions"."expires_at" IS
  'Data de expiração do plano alimentar. Calculada automaticamente na ativação (startDate + duração do plano).';
