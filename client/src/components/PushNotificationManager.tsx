// ARQUIVO: ./client/src/components/PushNotificationManager.tsx
// Componente informativo de notificações push no perfil do paciente.
// Exibe o status atual e permite ATIVAR (sem opção de desativar — recurso crítico).
// Quando bloqueado, exibe instruções específicas por dispositivo e um botão simples de reload.

import { Bell, BellRing, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

type DeviceType = 'android' | 'ios' | 'desktop-chrome' | 'desktop-firefox' | 'desktop-safari' | 'unknown';

function detectDevice(): DeviceType {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edg/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome/i.test(ua);
  const isFirefox = /firefox/i.test(ua);

  if (isIos) return 'ios';
  if (isAndroid) return 'android';
  if (isChrome) return 'desktop-chrome';
  if (isFirefox) return 'desktop-firefox';
  if (isSafari) return 'desktop-safari';
  return 'unknown';
}

export function PushNotificationManager() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const { toast } = useToast();

  if (permission === 'unsupported') return null;

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast({
        title: 'Notificações ativadas! 🔔',
        description: 'Você receberá alertas quando seu nutricionista disponibilizar novidades.',
      });
    }
  };

  // ── Ativo ──
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

  // ── Bloqueado — instruções específicas por dispositivo ──
  if (permission === 'denied') {
    const device = detectDevice();

    const instructionsByDevice: Record<string, { emoji: string; label: string; steps: string[] }> = {
      android: {
        emoji: '🤖',
        label: 'Android',
        steps: [
          'Abra as Configurações do celular',
          'Toque em Aplicativos → DiNutri',
          'Toque em Notificações e ative',
          'Volte ao app e toque em "Já reativei"',
        ],
      },
      ios: {
        emoji: '🍎',
        label: 'iPhone',
        steps: [
          'Abra os Ajustes do iPhone',
          'Role até encontrar DiNutri e toque',
          'Toque em Notificações',
          'Ative "Permitir Notificações" e volte ao app',
        ],
      },
      'desktop-chrome': {
        emoji: '🌐',
        label: 'Chrome (Desktop)',
        steps: [
          'Clique no 🔒 cadeado na barra de endereços',
          'Ao lado de "Notificações", selecione "Permitir"',
          'Recarregue a página',
        ],
      },
      'desktop-firefox': {
        emoji: '🦊',
        label: 'Firefox (Desktop)',
        steps: [
          'Clique no 🔒 cadeado na barra de endereços',
          'Clique em "Mais informações"',
          'Aba "Permissões" → "Receber notificações" → desmarque "Bloquear"',
          'Recarregue a página',
        ],
      },
      'desktop-safari': {
        emoji: '🧭',
        label: 'Safari (Desktop)',
        steps: [
          'Menu Safari → Configurações para este site',
          'Ao lado de "Notificações", selecione "Permitir"',
          'Recarregue a página',
        ],
      },
    };

    const info = instructionsByDevice[device] ?? {
      emoji: '⚙️',
      label: 'Configurações do navegador',
      steps: [
        'Acesse as configurações do seu navegador',
        'Encontre as permissões para o site do DiNutri',
        'Ative as notificações e recarregue a página',
      ],
    };

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
              Para reativar, siga os passos abaixo no seu dispositivo:
            </p>
          </div>
        </div>

        {/* Instruções específicas para o dispositivo detectado */}
        <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{info.emoji}</span>
            <p className="text-xs font-bold text-gray-700">{info.label}</p>
          </div>
          {info.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-[11px] text-gray-600 leading-snug">{step}</p>
            </div>
          ))}
        </div>

        {/* Botão simples de recarregar */}
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="w-full mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Já reativei nas configurações — recarregar
        </Button>
      </div>
    );
  }

  // ── Inativo — botão para ativar ──
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
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ativar'}
        </Button>
      </div>
    </div>
  );
}
