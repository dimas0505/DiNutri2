// ARQUIVO: ./client/src/components/PushNotificationManager.tsx
// Componente informativo de notificações push no perfil do paciente.
// Exibe o status atual e permite ATIVAR (mas não desativar pelo app — recurso importante).
// Quando bloqueado, exibe passo a passo para reativar nas configurações do navegador.

import { Bell, BellRing, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

export function PushNotificationManager() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const { toast } = useToast();

  // Não exibir nada se o navegador não suporta notificações
  if (permission === 'unsupported') {
    return null;
  }

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast({
        title: 'Notificações ativadas! 🔔',
        description: 'Você receberá alertas quando seu nutricionista disponibilizar novidades.',
      });
    }
  };

  // ── Estado: notificações já ativas ──
  if (isSubscribed) {
    return (
      <div className="rounded-xl border border-[#4E9F87]/30 bg-[#4E9F87]/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4E9F87]/15">
            <BellRing className="h-5 w-5 text-[#4E9F87]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-gray-800">Notificações Ativas</h3>
              <CheckCircle2 className="h-4 w-4 text-[#4E9F87]" />
            </div>
            <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
              Você receberá alertas de novos planos, avaliações e mensagens do seu nutricionista.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Estado: permissão bloqueada no navegador ──
  if (permission === 'denied') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800">Notificações Bloqueadas</h3>
            <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
              As notificações foram bloqueadas neste navegador. Siga os passos abaixo para reativar e não perder nenhum aviso do seu nutricionista.
            </p>
          </div>
        </div>

        {/* Passo a passo */}
        <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-800 mb-1">Como reativar:</p>
          {[
            'Toque no ícone de cadeado ou "ⓘ" na barra de endereço do navegador',
            'Selecione "Permissões" ou "Configurações do site"',
            'Encontre "Notificações" e mude para "Permitir"',
            'Recarregue o aplicativo',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-gray-600 leading-snug">{step}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Estado: ainda não ativou ──
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <Bell className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800">Notificações Push</h3>
          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
            Ative para receber alertas do seu nutricionista mesmo com o aplicativo fechado.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSubscribe}
          disabled={isLoading}
          className="shrink-0 bg-[#4E9F87] hover:bg-[#3d8a74] text-white"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Ativar'
          )}
        </Button>
      </div>
    </div>
  );
}
