// ARQUIVO: ./client/src/components/NotificationPopupBanner.tsx
//
// Pop-up flutuante persistente de notificações in-app para o paciente.
//
// Comportamento esperado:
//   1. Quando o paciente recebe uma notificação não lida, este banner aparece
//      automaticamente na parte inferior da tela com o botão "Visualizar".
//   2. Ao clicar em "Visualizar", uma modal se abre com o conteúdo completo
//      da notificação e o botão "Marcar como Lido" em destaque.
//   3. Se o paciente fechar a modal (ou o banner com o X) sem marcar como lido,
//      o banner some temporariamente e reaparece após REAPPEAR_DELAY_MS (30 segundos).
//   4. O banner SOMENTE para de aparecer quando o paciente clicar em
//      "Marcar como Lido", que chama a API e marca a notificação como lida.
//   5. Se a notificação tiver URL, o botão "Ver Detalhes" também aparece na modal,
//      navega para a URL e marca como lida.
//   6. Este componente é independente do InboxPanel — ambos coexistem sem conflito.

import { useEffect, useState, useCallback, useRef } from 'react';
import { X, CheckCheck, ExternalLink, BellRing, ClipboardList, UtensilsCrossed, MessageSquare, Info, Eye } from 'lucide-react';
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

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffH < 24) return `há ${diffH}h`;
  if (diffD === 1) return 'ontem';
  if (diffD < 7) return `há ${diffD} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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

function NotificationTypeIconLarge({ type }: { type: InAppNotification['type'] }) {
  const base = 'w-16 h-16 rounded-2xl flex items-center justify-center';
  switch (type) {
    case 'plan':
      return (
        <div className={cn(base, 'bg-[#F3ECFF]')}>
          <UtensilsCrossed className="w-8 h-8 text-[#7C3AED]" />
        </div>
      );
    case 'assessment':
      return (
        <div className={cn(base, 'bg-[#E5F8F1]')}>
          <ClipboardList className="w-8 h-8 text-[#10B981]" />
        </div>
      );
    case 'message':
      return (
        <div className={cn(base, 'bg-[#EEF2FF]')}>
          <MessageSquare className="w-8 h-8 text-[#6366F1]" />
        </div>
      );
    default:
      return (
        <div className={cn(base, 'bg-[#FFF3E7]')}>
          <Info className="w-8 h-8 text-[#F59E0B]" />
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
  // Controla se a modal de detalhes está aberta
  const [modalOpen, setModalOpen] = useState(false);

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
      setModalOpen(false);
      return;
    }

    // Se já há uma notificação sendo exibida, verifica se ela ainda está não lida
    if (current) {
      const synced = notifications.find((n) => n.id === current.id);
      if (!synced || synced.isRead) {
        // A notificação atual foi lida (por outra aba ou pelo InboxPanel) — avança
        clearReappearTimer();
        setModalOpen(false);
        showNextUnread(notifications);
      }
      // Caso contrário, mantém a notificação atual sem alterar visibilidade
      return;
    }

    // Sem notificação atual: tenta mostrar a primeira não lida
    showNextUnread(notifications);
  }, [notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Agenda o reaparecer do banner após REAPPEAR_DELAY_MS.
   * Só reaparece se a notificação ainda não foi marcada como lida.
   */
  const scheduleReappear = useCallback(() => {
    clearReappearTimer();
    if (current) {
      reappearTimerRef.current = setTimeout(() => {
        if (!sessionStorage.getItem(readKey(current.id))) {
          setVisible(true);
        }
      }, REAPPEAR_DELAY_MS);
    }
  }, [current, clearReappearTimer]);

  /**
   * Usuário clicou no X do banner: fecha o banner temporariamente e agenda o reaparecer.
   */
  const handleDismissBanner = useCallback(() => {
    setVisible(false);
    scheduleReappear();
  }, [scheduleReappear]);

  /**
   * Usuário clicou em "Visualizar": abre a modal com o conteúdo completo.
   */
  const handleOpenModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  /**
   * Usuário fechou a modal sem marcar como lido: fecha a modal,
   * esconde o banner e agenda o reaparecer.
   */
  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setVisible(false);
    scheduleReappear();
  }, [scheduleReappear]);

  /**
   * Usuário clicou em "Marcar como Lido": marca no servidor e remove o banner.
   */
  const handleMarkAsRead = useCallback(() => {
    if (!current) return;
    clearReappearTimer();
    // Registra na sessionStorage para evitar que o banner reapareça antes do polling
    sessionStorage.setItem(readKey(current.id), '1');
    markAsRead(current.id);
    setModalOpen(false);
    setCurrent(null);
    setVisible(false);
  }, [current, markAsRead, clearReappearTimer]);

  /**
   * Usuário clicou em "Ver Detalhes": navega para a URL e marca como lido.
   */
  const handleOpenDetails = useCallback(() => {
    if (!current) return;
    clearReappearTimer();
    sessionStorage.setItem(readKey(current.id), '1');
    markAsRead(current.id);
    const url = current.url;
    setModalOpen(false);
    setCurrent(null);
    setVisible(false);
    if (url) setLocation(url);
  }, [current, markAsRead, clearReappearTimer, setLocation]);

  // Limpa o timer ao desmontar o componente
  useEffect(() => {
    return () => clearReappearTimer();
  }, [clearReappearTimer]);

  if (!current) return null;

  return (
    <>
      {/* ── Banner flutuante ── */}
      {visible && (
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

            {/* Botão fechar banner */}
            <button
              type="button"
              onClick={handleDismissBanner}
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

                {/* Corpo truncado — convida o usuário a visualizar */}
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                  {current.body}
                </p>

                {/* Botão único: Visualizar */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleOpenModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-bold hover:bg-[#6D28D9] active:scale-[0.97] transition-all shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Visualizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de detalhes da notificação ── */}
      {modalOpen && current && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={handleCloseModal}
          />

          {/* Modal */}
          <div className="fixed z-[70] left-1/2 top-1/2 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            {/* Header com gradiente sutil */}
            <div className="relative h-28 bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Fechar mensagem"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center scale-110">
                <NotificationTypeIconLarge type={current.type} />
              </div>
            </div>

            <div className="px-6 pt-5 pb-7 text-center">
              {/* Título */}
              <h3 className="text-lg font-extrabold text-gray-900 leading-tight mb-1">
                {current.title}
              </h3>
              {/* Tempo relativo */}
              <p className="text-[11px] font-semibold text-purple-500 uppercase tracking-wider mb-4">
                {formatRelativeTime(current.createdAt)}
              </p>

              {/* Corpo completo */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {current.body}
                </p>
              </div>

              {/* Botões de ação */}
              <div className="flex flex-col gap-2.5">
                {/* Botão principal: Marcar como Lido — sempre em destaque */}
                <button
                  type="button"
                  onClick={handleMarkAsRead}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-[0_4px_12px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  Marcar como Lido
                </button>

                {/* Botão secundário: Ver Detalhes (só aparece se houver URL) */}
                {current.url && (
                  <button
                    type="button"
                    onClick={handleOpenDetails}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#7C3AED] text-white font-bold text-sm shadow-[0_4px_12px_rgba(124,58,237,0.3)] hover:bg-[#6D28D9] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver Detalhes
                  </button>
                )}

                {/* Botão terciário: Fechar sem marcar como lido */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full py-3 px-4 rounded-xl bg-gray-100 text-gray-500 font-semibold text-sm hover:bg-gray-200 active:scale-[0.98] transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
