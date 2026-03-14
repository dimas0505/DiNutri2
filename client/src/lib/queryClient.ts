import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Verifica se um erro é do tipo 4xx (erros do cliente).
 * Erros 4xx não devem ser retentados pois são falhas determinísticas
 * (ex: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found).
 */
export function isClientError(error: unknown): boolean {
  if (error instanceof Error) {
    const match = error.message.match(/^(\d{3}):/);
    if (match) {
      const status = parseInt(match[1], 10);
      return status >= 400 && status < 500;
    }
  }
  return false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      // Recarrega dados ao focar a janela para garantir que o usuário
      // veja informações atualizadas ao retornar ao app.
      refetchOnWindowFocus: true,
      // 1 minuto: dados são considerados frescos por 1 min após o fetch.
      // Reduzido de 5 minutos para garantir que dados desatualizados sejam
      // refetchados mais frequentemente, especialmente ao retornar ao app.
      staleTime: 1 * 60 * 1000,
      // Nao retenta erros do cliente (4xx) pois sao falhas deterministicas.
      // Retenta apenas erros de rede/servidor (5xx) uma vez.
      retry: (failureCount, error) => {
        if (isClientError(error)) return false;
        return failureCount < 1;
      },
      // Garbage collection: 5 minutos
      // Dados em cache serao descartados apos 5 minutos de inatividade
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
});
