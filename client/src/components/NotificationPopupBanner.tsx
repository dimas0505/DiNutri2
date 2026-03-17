// ARQUIVO: ./client/src/components/NotificationPopupBanner.tsx
//
// Pop-up flutuante persistente de notificações in-app para o paciente.
//
// Comportamento esperado:
//   1. Quando o paciente recebe uma notificação não lida, este banner aparece
//      automaticamente na parte inferior da tela.
//   2. Se o paciente fechar o banner (clicando no X), ele some temporariamente
//      e reaparece após REAPPEAR_DELAY_MS (30 segundos).
//   3. O banner SOMENTE para de aparecer quando o paciente clicar em
//      "Marcar como lido", que chama a API e marca a notificação como lida.
//   4. Ao clicar em "Ver detalhes", navega para a URL da notificação (se houver)
//      e marca como lida.
//   5. Este componente é independente do InboxPanel — ambos coexistem sem conflito.

import { useEffect, useState, useCallback, useRef } from 'react';
import { X, CheckCheck, ExternalLink, BellRing, ClipboardList, UtensilsCrossed, MessageSquare, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInboxNotifications } from '@/hooks/useInboxNotifications';
import { useLocation } from 'wouter';
import type { InAppNotification } from '@shared/schema';

/** Tempo em ms para o banner reaparecer após ser fechado sem marcar como lido */
const REAPPEAR_DELAY_MS = 30_000;

/** Chave de sessionStorage para rastrear notificações já marcadas como lidas nesta sessão */
function readKey(id: string) {
  return `notif-popup-read:${id}`;
}

function NotificationTypeIcon({ type }: { type: InAppNotification['type'] }) {
  const base = 'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0';
  switch (type) {
    case 'plan':
      return (
        <div className={cn(base, 'bg-[#F3ECFF]')}>
          <UtensilsCrossed className="w-5 h-5 text-[#7C3AED]" />
        </div>
      );
    case 'assessment':
      return (
        <div className={cn(base, 'bg-[#E5F8F1]')}>
          <ClipboardList className="w-5 h-5 text-[#10B981]" />
        </div>
      );
    case 'message':
      return (
        <div className={cn(base, 'bg-[#EEF2FF]')}>
          <MessageSquare className="w-5 h-5 text-[#6366F1]" />
        </div>
      );
    default:
      return (
        <div className={cn(base, 'bg-[#FFF3E7]')}>
          <Info className="w-5 h-5 text-[#F59E0B]" />
        </div>
      );
  }
}

export function NotificationPopupBanner() {
  const { notifications, markAsRead } = useInboxNotifications();
  const [, setLocation] = useLocation();

  // Notificação atualmente exibida no banner
  const [current, setCurrent] = useState<InAppNotification | null>(null);
  // Controla se o banner está visível (pode ser falso mesmo com notificação pendente,
  // enquanto aguarda o timer de reaparecer)
  const [visible, setVisible] = useState(false);

  // Ref para o timer de reaparecer, para poder cancelar se necessário
  const reappearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Cancela o timer de reaparecer, se existir.
   */
  const clearReappearTimer = useCallback(() => {
    if (reappearTimerRef.current !== null) {
      clearTimeout(reappearTimerRef.current);
      reappearTimerRef.current = null;
    }
  }, []);

  /**
   * Seleciona a próxima notificação não lida que ainda não foi marcada como lida
   * nesta sessão e a exibe no banner.
   */
  const showNextUnread = useCallback(
    (notifs: InAppNotification[]) => {
      const next = notifs.find(
        (n) => !n.isRead && !sessionStorage.getItem(readKey(n.id))
      );
      if (next) {
        setCurrent(next);
        setVisible(true);
      } else {
        setCurrent(null);
        setVisible(false);
      }
    },
    []
  );

  // Sempre que a lista de notificações mudar (polling a cada 2 min),
  // atualiza o estado interno:
  //   - Se a notificação atual foi marcada como lida no servidor, passa para a próxima.
  //   - Se não há notificação atual, tenta mostrar a primeira não lida.
  useEffect(() => {
    if (!notifications.length) {
      setCurrent(null);
      setVisible(false);
      return;
    }

    // Se já há uma notificação sendo exibida, verifica se ela ainda está não lida
    if (current) {
      const synced = notifications.find((n) => n.id === current.id);
      if (!synced || synced.isRead) {
        // A notificação atual foi lida (por outra aba ou pelo InboxPanel) — avança
        clearReappearTimer();
        showNextUnread(notifications);
      }
      // Caso contrário, mantém a notificação atual sem alterar visibilidade
      return;
    }

    // Sem notificação atual: tenta mostrar a primeira não lida
    showNextUnread(notifications);
  }, [notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Usuário clicou no X: fecha o banner temporariamente e agenda o reaparecer.
   */
  const handleDismiss = useCallback(() => {
    setVisible(false);
    clearReappearTimer();

    if (current) {
      reappearTimerRef.current = setTimeout(() => {
        // Só reaparece se a notificação ainda não foi lida
        if (!sessionStorage.getItem(readKey(current.id))) {
          setVisible(true);
        }
      }, REAPPEAR_DELAY_MS);
    }
  }, [current, clearReappearTimer]);

  /**
   * Usuário clicou em "Marcar como lido": marca no servidor e remove o banner.
   */
  const handleMarkAsRead = useCallback(() => {
    if (!current) return;
    clearReappearTimer();
    // Registra na sessionStorage para evitar que o banner reapareça antes do polling
    sessionStorage.setItem(readKey(current.id), '1');
    markAsRead(current.id);
    setCurrent(null);
    setVisible(false);
  }, [current, markAsRead, clearReappearTimer]);

  /**
   * Usuário clicou em "Ver detalhes": navega para a URL e marca como lido.
   */
  const handleOpenDetails = useCallback(() => {
    if (!current) return;
    clearReappearTimer();
    sessionStorage.setItem(readKey(current.id), '1');
    markAsRead(current.id);
    const url = current.url;
    setCurrent(null);
    setVisible(false);
    if (url) setLocation(url);
  }, [current, markAsRead, clearReappearTimer, setLocation]);

  // Limpa o timer ao desmontar o componente
  useEffect(() => {
    return () => clearReappearTimer();
  }, [clearReappearTimer]);

  if (!visible || !current) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-label="Nova notificação"
      className={cn(
        // Posicionamento: fixo, acima da bottom navigation (pb-20 = 80px),
        // com margem lateral e z-index alto o suficiente para ficar sobre o conteúdo
        // mas abaixo do InboxPanel (z-[60]) e do modal de detalhes (z-[70])
        'fixed bottom-24 inset-x-3 z-[50] max-w-sm mx-auto',
        'animate-in slide-in-from-bottom-4 fade-in duration-300'
      )}
    >
      <div className="relative bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-purple-100 overflow-hidden">
        {/* Faixa de destaque no topo */}
        <div className="h-1 w-full bg-gradient-to-r from-[#7C3AED] to-[#6366F1]" />

        {/* Botão fechar */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar notificação temporariamente"
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3 px-4 pt-3 pb-4 pr-10">
          {/* Ícone do tipo de notificação */}
          <NotificationTypeIcon type={current.type} />

          <div className="flex-1 min-w-0">
            {/* Label "Nova notificação" */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <BellRing className="w-3 h-3 text-[#7C3AED]" />
              <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider">
                Nova notificação
              </span>
            </div>

            {/* Título */}
            <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-1">
              {current.title}
            </p>

            {/* Corpo */}
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
              {current.body}
            </p>

            {/* Botões de ação */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleMarkAsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 hover:bg-emerald-100 active:scale-[0.97] transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar como lido
              </button>

              {current.url && (
                <button
                  type="button"
                  onClick={handleOpenDetails}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-bold hover:bg-[#6D28D9] active:scale-[0.97] transition-all shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver detalhes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
