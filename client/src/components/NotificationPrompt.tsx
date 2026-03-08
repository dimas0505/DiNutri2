// ARQUIVO: ./client/src/components/NotificationPrompt.tsx
// Popup persuasivo para incentivar o paciente a ativar as notificações push.
// Exibido automaticamente no dashboard TODA VEZ que o app abrir, até o usuário ativar.
// Se a permissão estiver bloqueada no navegador, exibe instruções para desbloquear.

import { useState, useEffect } from "react";
import { Bell, X, BellRing, Sparkles, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

export function NotificationPrompt() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Aguarda 2 segundos para não aparecer imediatamente ao abrir o app
    const timer = setTimeout(() => {
      // Exibe sempre que: não está inscrito E o navegador suporta notificações
      // Isso inclui o caso "denied" — para mostrar instruções de como desbloquear
      if (permission !== "unsupported" && !isSubscribed) {
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
    // Se negado, o popup muda de visual automaticamente (permission passa a "denied")
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  // ── Caso especial: permissão bloqueada no navegador ──
  if (permission === "denied") {
    return (
      <>
        {/* Overlay escuro */}
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={handleDismiss}
        />

        {/* Popup bottom sheet — estado bloqueado */}
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Faixa decorativa superior — âmbar para indicar atenção */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-400" />

            {/* Botão fechar */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-6 pt-5 pb-6">
              {/* Ícone */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Bell className="h-8 w-8 text-white" />
                </div>
              </div>

              {/* Título */}
              <h2 className="text-center text-xl font-bold text-gray-900 leading-tight">
                Notificações bloqueadas ⚠️
              </h2>

              {/* Explicação */}
              <p className="text-center text-sm text-gray-500 mt-2 leading-relaxed">
                Você bloqueou as notificações neste navegador. Para voltar a receber alertas do seu nutricionista, é necessário reativar nas configurações.
              </p>

              {/* Passo a passo */}
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-800">Como reativar:</p>
                {[
                  "Toque no ícone de cadeado ou informações na barra de endereço",
                  "Selecione \"Permissões\" ou \"Configurações do site\"",
                  "Encontre \"Notificações\" e mude para \"Permitir\"",
                  "Recarregue o aplicativo",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-amber-700 leading-snug">{step}</p>
                  </div>
                ))}
              </div>

              {/* Botões */}
              <div className="mt-5 space-y-2.5">
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  className="w-full h-11 text-sm rounded-2xl border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Entendi, vou verificar as configurações
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Caso padrão: permissão ainda não solicitada ──
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
                Agora não
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
