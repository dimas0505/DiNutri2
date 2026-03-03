-- Adiciona o status "pending_plan" à coluna status da tabela subscriptions.
-- Este status representa um plano cujo acesso já foi liberado ao paciente,
-- mas o plano alimentar ainda está sendo elaborado pelo nutricionista.
-- A contagem de validade (startDate / expiresAt) só é definida quando o
-- nutricionista aciona "Ativar Plano Alimentar", que muda o status para "active".
--
-- Como o campo é varchar (não pgEnum nativo), nenhuma alteração de tipo é necessária.
-- A constraint de check existente (se houver) pode precisar ser atualizada.
-- Verificar e atualizar constraint de check, se existir:
DO $$
BEGIN
  -- Remove constraint de check antiga caso exista
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'subscriptions'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%status%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE subscriptions DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'subscriptions'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%status%'
      LIMIT 1
    );
  END IF;
END $$;

-- Adiciona nova constraint de check incluindo pending_plan
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_status_check"
  CHECK (status IN ('active', 'pending_payment', 'pending_approval', 'pending_plan', 'expired', 'canceled'));
