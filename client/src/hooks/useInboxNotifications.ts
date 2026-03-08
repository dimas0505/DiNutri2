// ARQUIVO: ./client/src/hooks/useInboxNotifications.ts
// Hook para gerenciar notificações in-app (inbox interno do paciente).
//
// Funciona 100% independente da permissão de notificações push do sistema.
// O paciente sempre verá as mensagens do nutricionista ao abrir o app,
// mesmo que tenha negado ou revogado as permissões de push.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { InAppNotification } from '@shared/schema';
// apiRequest é usado nas mutations (PATCH)

export function useInboxNotifications() {
  const queryClient = useQueryClient();

  // Busca todas as notificações do inbox
  const { data: notifications = [], isLoading } = useQuery<InAppNotification[]>({
    queryKey: ['/api/notifications/inbox'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/inbox', { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao buscar notificações');
      return res.json();
    },
    // Revalida a cada 2 minutos para detectar novas mensagens
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  // Conta de não lidas (para o badge)
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count', { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao contar notificações');
      return res.json();
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const unreadCount = unreadData?.count ?? 0;

  // Marca uma notificação como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('PATCH', `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/inbox'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Marca todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', '/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/inbox'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
}
