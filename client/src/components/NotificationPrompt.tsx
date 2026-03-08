// ARQUIVO: ./client/src/components/NotificationPrompt.tsx
// Popup persuasivo para incentivar o paciente a ativar as notificações push.
// Exibido automaticamente no dashboard quando o usuário ainda não ativou.

import { useState, useEffect } from "react";
import { Bell, X, BellRing, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

const DISMISSED_KEY = "dinutri_notif_prompt_dismissed";
const DISMISSED_EXPIRY_DAYS = 3; // Mostrar novamente após 3 dias se não ativou

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    const diffDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return diffDays < DISMISSED_EXPIRY_DAYS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {}
}

export function NotificationPrompt() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Aguarda um momento para não aparecer imediatamente ao abrir o app
    const timer = setTimeout(() => {
      if (
        permission !== "unsupported" &&
        permission !== "denied" &&
        !isSubscribed &&
        !wasDismissedRecently()
      ) {
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
    } else if (permission === "denied") {
      toast({
        title: "Permissão bloqueada",
        description:
          "Para ativar, acesse as configurações do seu navegador e permita notificações para este site.",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = () => {
    markDismissed();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay escuro */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={handleDismiss}
      />

      {/* Popup bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 animate-in slide-in-from-bottom-4 duration-300">
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Faixa decorativa superior */}
          <div
            className="h-1.5 w-full"
            style={{ background: "linear-gradient(90deg, #7C3AED, #4E9F87, #F59E0B)" }}
          />

          {/* Botão fechar */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="px-6 pt-5 pb-6">
            {/* Ícone animado */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4E9F87] flex items-center justify-center shadow-lg">
                  <BellRing className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>

            {/* Título */}
            <h2 className="text-center text-xl font-bold text-gray-900 leading-tight">
              Fique por dentro de tudo! 🎯
            </h2>

            {/* Mensagem persuasiva */}
            <p className="text-center text-sm text-gray-500 mt-2 leading-relaxed">
              Ative as notificações e receba as dicas e novidades do seu nutricionista
              <span className="font-semibold text-[#7C3AED]"> diretamente no seu celular</span>,
              mesmo com o app fechado.
            </p>

            {/* Benefícios */}
            <div className="mt-4 space-y-2.5">
              {[
                { emoji: "🥗", text: "Aviso quando seu plano alimentar estiver pronto" },
                { emoji: "📊", text: "Alerta quando seu relatório de avaliação for enviado" },
                { emoji: "💬", text: "Mensagens e dicas personalizadas do nutricionista" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                  <span className="text-lg shrink-0">{item.emoji}</span>
                  <p className="text-xs text-gray-600 leading-snug">{item.text}</p>
                </div>
              ))}
            </div>

            {/* Botões */}
            <div className="mt-5 space-y-2.5">
              <Button
                onClick={handleActivate}
                disabled={isLoading}
                className="w-full h-12 text-sm font-bold rounded-2xl text-white shadow-lg"
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
                Agora não, lembrar depois
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
