// ARQUIVO: ./client/src/components/InboxPanel.tsx
// Painel de inbox de notificações in-app do paciente.
//
// Exibe todas as mensagens do nutricionista dentro do app, independente
// de qualquer permissão de notificação push do sistema operacional.
// Acessado pelo botão de sininho no dashboard do paciente.

import { useState } from 'react';
import { Bell, BellRing, CheckCheck, X, ExternalLink, MessageSquare, ClipboardList, UtensilsCrossed, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInboxNotifications } from '@/hooks/useInboxNotifications';
import { useLocation } from 'wouter';
import type { InAppNotification } from '@shared/schema';

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

function NotificationIcon({ type }: { type: InAppNotification['type'] }) {
  const base = 'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0';
  switch (type) {
    case 'plan':
      return (
        <div className={cn(base, 'bg-[#F3ECFF]')}>
          <UtensilsCrossed className="w-4 h-4 text-[#7C3AED]" />
        </div>
      );
    case 'assessment':
      return (
        <div className={cn(base, 'bg-[#E5F8F1]')}>
          <ClipboardList className="w-4 h-4 text-[#10B981]" />
        </div>
      );
    case 'message':
      return (
        <div className={cn(base, 'bg-[#EEF2FF]')}>
          <MessageSquare className="w-4 h-4 text-[#6366F1]" />
        </div>
      );
    default:
      return (
        <div className={cn(base, 'bg-[#FFF3E7]')}>
          <Info className="w-4 h-4 text-[#F59E0B]" />
        </div>
      );
  }
}

interface InboxPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InboxPanel({ isOpen, onClose }: InboxPanelProps) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useInboxNotifications();
  const [, setLocation] = useLocation();

  if (!isOpen) return null;

  const handleNotificationClick = (notif: InAppNotification) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    if (notif.url) {
      onClose();
      setLocation(notif.url);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Painel lateral / bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] rounded-t-3xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 pb-safe">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Notificações</h2>
              {unreadCount > 0 && (
                <p className="text-[11px] text-[#7C3AED] font-medium">{unreadCount} não lida{unreadCount !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-xs text-[#7C3AED] font-medium px-2 py-1 rounded-lg hover:bg-[#7C3AED]/10 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
          {isLoading ? (
            <div className="flex flex-col gap-2 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-200 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Bell className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Nenhuma notificação ainda</p>
              <p className="text-xs text-gray-400 mt-1">As mensagens do seu nutricionista aparecerão aqui</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  'w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all duration-150',
                  notif.isRead
                    ? 'bg-gray-50 hover:bg-gray-100'
                    : 'bg-[#7C3AED]/5 border border-[#7C3AED]/15 hover:bg-[#7C3AED]/10'
                )}
              >
                <NotificationIcon type={notif.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      'text-sm leading-snug',
                      notif.isRead ? 'font-medium text-gray-700' : 'font-bold text-gray-900'
                    )}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                    {notif.body}
                  </p>
                  {notif.url && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <ExternalLink className="w-3 h-3 text-[#7C3AED]" />
                      <span className="text-[11px] text-[#7C3AED] font-medium">Ver detalhes</span>
                    </div>
                  )}
                </div>
                {!notif.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] flex-shrink-0 mt-1.5" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Botão do sininho com badge (para usar no dashboard)
// ─────────────────────────────────────────────────────────────────────────────

interface InboxBellButtonProps {
  className?: string;
}

export function InboxBellButton({ className }: InboxBellButtonProps) {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useInboxNotifications();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center',
          className
        )}
        title="Notificações do nutricionista"
        aria-label={`Abrir notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-white animate-wiggle" />
        ) : (
          <Bell className="w-5 h-5 text-white/80" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 border-2 border-[#7C3AED] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white leading-none px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>
      <InboxPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
