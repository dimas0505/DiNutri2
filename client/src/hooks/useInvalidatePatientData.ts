import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Hook que retorna uma função para invalidar todos os dados do paciente logado.
 *
 * Deve ser chamado ao navegar para qualquer tela do paciente, garantindo
 * que os dados exibidos sejam sempre os mais recentes do servidor.
 *
 * Queries invalidadas:
 * - /api/patient/my-profile       → perfil, peso, objetivo, suplementos
 * - /api/patient/my-prescriptions → plano alimentar e prescrições
 * - /api/my-assessments           → avaliações e documentos do nutricionista
 * - /api/my-anthropometry/latest  → última avaliação antropométrica
 * - /api/patients                 → dados dependentes do patientId (assinatura, diário)
 *
 * Nota: a chave "/api/patients" como prefixo invalida também as sub-queries
 * como ["/api/patients", patientId, "subscription"] e
 * ["/api/patients", patientId, "food-diary", "entries"].
 */
export function useInvalidatePatientData() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/patient/my-profile"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patient/my-prescriptions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/my-assessments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/my-anthropometry/latest"] });
    // Invalida sub-queries dependentes do patientId (assinatura, diário, etc.)
    queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
  }, [queryClient]);

  return invalidate;
}
