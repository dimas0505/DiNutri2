// ARQUIVO: ./client/src/components/PushNotificationManager.tsx
// Componente informativo de notificações push no perfil do paciente.
// Exibe o status atual e permite ATIVAR (sem opção de desativar — recurso crítico).
// Quando bloqueado, exibe instruções por sistema operacional (Android / iPhone).
//
// FIX DEFINITIVO: Adiciona botão "Já ativei, verificar novamente" que força
// uma revalidação manual da permissão. Isso contorna limitações de cache de
// permissão em PWAs Android/iOS onde o navegador não detecta mudanças
// automaticamente após o usuário voltar das configurações do sistema.

import { Bell, BellRing, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export function PushNotificationManager() {
  const { permission, isSubscribed, isLoading, subscribe, refreshPermission } = usePushNotifications();
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

  // ── Botão de revalidação manual ──
  // Lê a permissão diretamente do navegador (sem estado cacheado do React) e:
  //   • Se 'granted' ou 'default' → tenta assinar as notificações push imediatamente
  //     (requestPermission() retorna 'granted' sem dialog quando já foi autorizado pelo sistema)
  //   • Se ainda 'denied' → força reload da página para limpar o cache de permissão do PWA
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const currentPermission = Notification.permission;

      if (currentPermission === 'granted' || currentPermission === 'default') {
        // Permissão disponível — assinatura pode ser criada diretamente
        const success = await subscribe();
        if (success) {
          toast({
            title: 'Notificações ativadas! 🔔',
            description: 'Você receberá alertas quando seu nutricionista disponibilizar novidades.',
          });
        } else {
          toast({
            title: 'Não foi possível ativar',
            description: 'Verifique as permissões nas configurações e tente novamente.',
            variant: 'destructive',
          });
        }
      } else {
        // Ainda 'denied' no cache do navegador — recarregar a página é a única
        // forma confiável de forçar o navegador a reler o estado real do SO.
        await refreshPermission(true);
      }
    } catch (err) {
      console.error('Erro ao revalidar permissão:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível revalidar a permissão. Tente novamente.',
        variant: 'destructive',
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

        {/* ── NOVO: Botão de revalidação manual ── */}
        {/* Contorna limitações de cache de permissão em PWAs Android/iOS */}
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
