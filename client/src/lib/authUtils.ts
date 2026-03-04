/**
 * Verifica se um erro é de autenticação (401 Unauthorized).
 * Usado para redirecionar o usuário para a tela de login.
 */
export function isUnauthorizedError(error: Error): boolean {
  return /^401:/.test(error.message);
}

/**
 * Verifica se um erro é de autorização (403 Forbidden).
 * Indica que o usuário está autenticado mas não tem permissão para o recurso.
 */
export function isForbiddenError(error: Error): boolean {
  return /^403:/.test(error.message);
}

/**
 * Verifica se um erro é de recurso não encontrado (404 Not Found).
 * Indica que o recurso solicitado não existe.
 */
export function isNotFoundError(error: Error): boolean {
  return /^404:/.test(error.message);
}

/**
 * Verifica se um erro é de conflito (409 Conflict).
 * Indica que a operação conflita com o estado atual do recurso (ex: email duplicado).
 */
export function isConflictError(error: Error): boolean {
  return /^409:/.test(error.message);
}

/**
 * Extrai o código de status HTTP de uma mensagem de erro no formato "NNN: mensagem".
 * Retorna null se o formato não for reconhecido.
 */
export function getErrorStatus(error: Error): number | null {
  const match = error.message.match(/^(\d{3}):/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Retorna uma mensagem de erro amigável em português com base no código de status HTTP.
 */
export function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Ocorreu um erro inesperado.";

  const status = getErrorStatus(error);
  switch (status) {
    case 400: return "Dados inválidos. Verifique as informações e tente novamente.";
    case 401: return "Sessão expirada. Por favor, faça login novamente.";
    case 403: return "Você não tem permissão para realizar esta ação.";
    case 404: return "O recurso solicitado não foi encontrado.";
    case 409: return "Conflito: este registro já existe.";
    case 422: return "Dados não processáveis. Verifique as informações enviadas.";
    case 429: return "Muitas requisições. Aguarde um momento e tente novamente.";
    case 500: return "Erro interno do servidor. Tente novamente em instantes.";
    case 502:
    case 503:
    case 504: return "Serviço temporariamente indisponível. Tente novamente em instantes.";
    default: return error.message || "Ocorreu um erro inesperado.";
  }
}
