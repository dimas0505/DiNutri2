// ARQUIVO: ./client/src/components/PushNotificationManager.tsx
// Componente informativo de notificações push no perfil do paciente.
// Exibe o status atual e permite ATIVAR (sem opção de desativar — recurso crítico).
// Quando bloqueado, exibe instruções por sistema operacional (Android / iPhone).
//
// SOLUÇÃO DEFINITIVA (Google):
// O botão "Já ativei, verificar novamente" agora:
// 1. Se a permissão já é 'granted', assina direto no PushManager
// 2. Se ainda é 'denied', injeta flag no sessionStorage e força reload
// 3. Após o reload, o hook retoma a assinatura automaticamente

import { Bell, BellRing, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

// Shared key with NotificationPrompt — must be cleared before a force-reload so
// that the blocked popup can reappear if permission is still denied after reload.
const SESSION_BLOCKED_SHOWN = 'dinutri_blocked_shown_session';

export function PushNotificationManager() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // ── Botão de revalidação manual (SOLUÇÃO GOOGLE) ──
  // Implementa o fluxo de retomada automática + sincronização
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    sessionStorage.removeItem(SESSION_BLOCKED_SHOWN);
    
    try {
      const currentPerm = Notification.permission;

      if (currentPerm === 'granted') {
        // Se o navegador já reconheceu a permissão, só falta assinar no PushManager
        console.log('[PushNotificationManager] Permissão já concedida, assinando...');
        const success = await subscribe();
        if (success) {
          toast({ 
            title: 'Notificações ativadas! 🔔', 
            description: 'Tudo pronto para você receber os alertas.' 
          });
        } else {
          toast({ 
            title: 'Aviso', 
            description: 'Permissão concedida, mas houve um erro ao registrar no servidor.', 
            variant: 'destructive' 
          });
        }
      } else if (currentPerm === 'denied') {
        // Cenário principal no Android/iOS:
        // O navegador ainda reporta 'denied' mesmo que o usuário já tenha ativado no SO.
        // Salvamos a intenção antes do reload — o hook vai retomá-la após recarregar.
        console.log('[PushNotificationManager] Permissão ainda negada, injetando flag e recarregando...');
        sessionStorage.setItem('PENDING_PUSH_SUBSCRIBE', 'true');
        toast({ 
          title: 'Aplicando permissões...', 
          description: 'Recarregando o aplicativo para ler as novas configurações.' 
        });
        window.location.reload();
      } else {
        // Estado 'default' — solicitar permissão nativa ao usuário
        console.log('[PushNotificationManager] Permissão em estado default, solicitando...');
        await subscribe();
      }
    } catch (err) {
      console.error('[PushNotificationManager] Erro ao revalidar:', err);
      toast({ 
        title: 'Erro', 
        description: 'Falha ao verificar permissões. Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setIsRefreshing(false);
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

  // ── Bloqueado — instruções por sistema operacional ──
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
              As notificações do aplicativo estão bloqueadas. Para reativar, acesse as configurações do seu celular:
            </p>
          </div>
        </div>

        {/* Android */}
        <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">🤖</span>
            <p className="text-xs font-bold text-gray-700">Android</p>
          </div>
          {[
            "Abra as Configurações do celular",
            "Toque em Aplicativos → DiNutri",
            "Toque em Notificações e ative",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-[11px] text-gray-600 leading-snug">{step}</p>
            </div>
          ))}
        </div>

        {/* iPhone */}
        <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">🍎</span>
            <p className="text-xs font-bold text-gray-700">iPhone</p>
          </div>
          {[
            "Abra os Ajustes do iPhone",
            "Role e toque em DiNutri",
            "Toque em Notificações e ative \"Permitir Notificações\"",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-[#4E9F87]/15 text-[#4E9F87] text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-[11px] text-gray-600 leading-snug">{step}</p>
            </div>
          ))}
        </div>

        {/* ── Botão de revalidação manual (SOLUÇÃO GOOGLE) ── */}
        <Button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="w-full mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Já ativei, verificar novamente
            </>
          )}
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
