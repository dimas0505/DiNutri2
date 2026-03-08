// ARQUIVO: ./client/src/components/PushNotificationManager.tsx
// Componente para o paciente ativar/desativar notificações push

import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationManagerProps {
  /** Se true, exibe como card completo; se false, exibe como botão compacto */
  variant?: 'card' | 'compact';
}

export function PushNotificationManager({ variant = 'card' }: PushNotificationManagerProps) {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const { toast } = useToast();

  if (permission === 'unsupported') {
    return null; // Não exibir nada se o navegador não suporta
  }

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast({
        title: 'Notificações ativadas! 🔔',
        description: 'Você receberá alertas quando seu nutricionista disponibilizar novidades.',
      });
    } else if (permission === 'denied') {
      toast({
        title: 'Permissão negada',
        description: 'Para ativar as notificações, acesse as configurações do seu navegador e permita notificações para este site.',
        variant: 'destructive',
      });
    }
  };

  const handleUnsubscribe = async () => {
    await unsubscribe();
    toast({
      title: 'Notificações desativadas',
      description: 'Você não receberá mais alertas push deste aplicativo.',
    });
  };

  if (variant === 'compact') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
        disabled={isLoading || permission === 'denied'}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {isSubscribed ? 'Desativar notificações' : 'Ativar notificações'}
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isSubscribed ? 'bg-[#4E9F87]/10' : 'bg-gray-100'}`}>
          {isSubscribed ? (
            <BellRing className="h-5 w-5 text-[#4E9F87]" />
          ) : (
            <Bell className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800">
            Notificações Push
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
            {isSubscribed
              ? 'Você receberá alertas quando seu nutricionista disponibilizar um novo plano alimentar, relatório de avaliação ou enviar uma mensagem.'
              : permission === 'denied'
              ? 'Notificações bloqueadas. Acesse as configurações do navegador para permitir.'
              : 'Ative para receber alertas mesmo com o aplicativo fechado.'}
          </p>
          {permission === 'denied' && (
            <p className="mt-1 text-xs text-amber-600 font-medium">
              ⚠️ Permissão bloqueada no navegador
            </p>
          )}
        </div>
        <Button
          variant={isSubscribed ? 'outline' : 'default'}
          size="sm"
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={isLoading || permission === 'denied'}
          className={`shrink-0 ${!isSubscribed && permission !== 'denied' ? 'bg-[#4E9F87] hover:bg-[#3d8a74] text-white' : ''}`}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSubscribed ? (
            'Desativar'
          ) : (
            'Ativar'
          )}
        </Button>
      </div>
    </div>
  );
}
