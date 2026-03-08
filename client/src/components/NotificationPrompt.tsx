// ARQUIVO: ./client/src/components/NotificationPrompt.tsx
// Popup persuasivo para incentivar o paciente a ativar as notificações push.
//
// Comportamento:
// - Permissão "default": aparece toda vez que o app abre, até o usuário ativar.
// - Permissão "denied": aparece UMA VEZ por sessão com instruções de Android/iPhone.
//   Não fica em loop — o usuário precisa ir nas configurações do celular para resolver.
// - Quando o usuário libera a permissão nas configurações do sistema e volta ao app,
//   o flag de sessão é limpo e o popup de ativação reaparece automaticamente.

import { useState, useEffect, useRef } from "react";
import { Bell, X, BellRing, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

// Chave para não mostrar o popup de "bloqueado" mais de uma vez por sessão
const SESSION_BLOCKED_SHOWN = "dinutri_blocked_shown_session";

export function NotificationPrompt() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  // Rastrear o valor anterior de permission para detectar transição denied → default
  const prevPermissionRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPermissionRef.current;

    // ── FIX: Quando a permissão volta de "denied" para "default" (usuário
    // liberou nas configurações do sistema e retornou ao app), limpar o flag
    // de sessão para que o popup de ativação possa reaparecer normalmente.
    if (prev === 'denied' && permission === 'default') {
      sessionStorage.removeItem(SESSION_BLOCKED_SHOWN);
      setVisible(false); // fechar qualquer popup aberto antes de reabrir
    }

    prevPermissionRef.current = permission;

    const timer = setTimeout(() => {
      if (isSubscribed || permission === "unsupported") return;

      if (permission === "denied") {
        // Mostrar o popup de bloqueado apenas uma vez por sessão
        const alreadyShown = sessionStorage.getItem(SESSION_BLOCKED_SHOWN);
        if (!alreadyShown) {
          setVisible(true);
          sessionStorage.setItem(SESSION_BLOCKED_SHOWN, "1");
        }
      } else {
        // Permissão "default": mostrar toda vez até ativar
        setVisible(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [permission, isSubscribed]);

  const handleActivate = async () => {
    const success = await subscribe();
    if (success) {
      setVisible(false);
      toast({
        title: "Notificações ativadas! 🔔",
        description: "Você receberá alertas do seu nutricionista em tempo real.",
      });
    }
    // Se negado agora, o useEffect vai re-executar com permission="denied"
    // e o popup de instruções aparecerá automaticamente
  };

  const handleDismiss = () => setVisible(false);

  if (!visible) return null;

  // ── Popup: permissão bloqueada — instruções por sistema operacional ──
  if (permission === "denied") {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          onClick={handleDismiss}
        />
        <div className="fixed inset-x-4 bottom-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Faixa âmbar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-400" />

            {/* Botão fechar */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-5 pt-5 pb-5">
              {/* Ícone */}
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                  <Bell className="h-7 w-7 text-white" />
                </div>
              </div>

              <h2 className="text-center text-lg font-bold text-gray-900">
                Notificações bloqueadas ⚠️
              </h2>
              <p className="text-center text-xs text-gray-500 mt-1.5 leading-relaxed">
                Você bloqueou as notificações do aplicativo. Para voltar a receber alertas do seu nutricionista, siga as instruções abaixo:
              </p>

              {/* Instruções por OS */}
              <div className="mt-3 space-y-2.5">
                {/* Android */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">🤖</span>
                    <p className="text-xs font-bold text-gray-700">Android</p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      "Abra as Configurações do celular",
                      "Toque em Aplicativos → DiNutri",
                      "Toque em Notificações",
                      "Ative as notificações e volte ao app",
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-[11px] text-gray-600 leading-snug">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* iPhone */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">🍎</span>
                    <p className="text-xs font-bold text-gray-700">iPhone</p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      "Abra os Ajustes do iPhone",
                      "Role até encontrar DiNutri e toque",
                      "Toque em Notificações",
                      "Ative \"Permitir Notificações\" e volte ao app",
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-[#4E9F87]/15 text-[#4E9F87] text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-[11px] text-gray-600 leading-snug">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="mt-4 w-full text-xs text-gray-400 py-1 hover:text-gray-600 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Popup padrão: permissão ainda não solicitada ──
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={handleDismiss}
      />
      <div className="fixed inset-x-4 bottom-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Faixa decorativa */}
          <div
            className="h-1.5 w-full"
            style={{ background: "linear-gradient(90deg, #7C3AED, #4E9F87, #F59E0B)" }}
          />

          {/* Botão fechar */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="px-5 pt-5 pb-5">
            {/* Ícone */}
            <div className="flex justify-center mb-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4E9F87] flex items-center justify-center shadow-md">
                  <BellRing className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-center text-lg font-bold text-gray-900">
              Fique por dentro de tudo! 🎯
            </h2>
            <p className="text-center text-xs text-gray-500 mt-1.5 leading-relaxed">
              Ative as notificações e receba as dicas do seu nutricionista
              <span className="font-semibold text-[#7C3AED]"> diretamente no seu celular</span>,
              mesmo com o aplicativo fechado.
            </p>

            {/* Benefícios */}
            <div className="mt-3 space-y-2">
              {[
                { emoji: "🥗", text: "Aviso quando seu plano alimentar estiver pronto" },
                { emoji: "📊", text: "Alerta quando seu relatório de avaliação for enviado" },
                { emoji: "💬", text: "Mensagens e dicas personalizadas do nutricionista" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-base shrink-0">{item.emoji}</span>
                  <p className="text-[11px] text-gray-600 leading-snug">{item.text}</p>
                </div>
              ))}
            </div>

            {/* Botões */}
            <div className="mt-4 space-y-2">
              <Button
                onClick={handleActivate}
                disabled={isLoading}
                className="w-full h-11 text-sm font-bold rounded-2xl text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4E9F87 100%)" }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Ativando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Ativar Notificações Agora
                  </span>
                )}
              </Button>
              <button
                onClick={handleDismiss}
                className="w-full text-xs text-gray-400 py-1 hover:text-gray-600 transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
