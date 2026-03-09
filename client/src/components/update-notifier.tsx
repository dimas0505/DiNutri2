import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Componente responsável por detectar e aplicar atualizações do Service Worker.
 *
 * Problemas corrigidos nesta versão:
 * 1. Não detectava novas versões durante a sessão (só verificava no mount).
 * 2. O listener de 'controllerchange' era adicionado múltiplas vezes,
 *    podendo causar reloads em loop.
 * 3. Não verificava periodicamente se há uma nova versão disponível.
 */
export function UpdateNotifier() {
  const { toast, dismiss } = useToast();
  // Ref para garantir que o listener de controllerchange seja adicionado apenas uma vez
  const controllerChangeListenerAdded = useRef(false);
  // Ref para evitar que o reload seja chamado múltiplas vezes
  const isReloading = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          console.log('[UpdateNotifier] Update check completed.');
        }
      } catch (error) {
        console.warn('[UpdateNotifier] Update check failed:', error);
      }
    };

    const handleControllerChange = () => {
      // Evita reloads múltiplos caso o evento dispare mais de uma vez
      if (isReloading.current) return;
      isReloading.current = true;
      console.log('[UpdateNotifier] Controller changed, reloading page...');
      window.location.reload();
    };

    const applyUpdate = (worker: ServiceWorker) => {
      console.log('[UpdateNotifier] Applying update from waiting service worker...');

      // Registra o listener de controllerchange apenas uma vez
      if (!controllerChangeListenerAdded.current) {
        controllerChangeListenerAdded.current = true;
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      }

      const { id } = toast({
        title: 'Atualizando o aplicativo...',
        description: 'Uma nova versão está disponível. A página será recarregada em instantes.',
      });

      setTimeout(() => dismiss(id), 4000);

      // Instrui o SW em espera a assumir o controle imediatamente
      worker.postMessage({ action: 'SKIP_WAITING' });
    };

    const checkForWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        console.log('[UpdateNotifier] Found waiting service worker.');
        applyUpdate(registration.waiting);
      }
    };

    // Verifica se já há um SW em espera ao montar o componente
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;

      checkForWaitingWorker(registration);

      // Detecta novos SWs que entram no estado "waiting" durante a sessão
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        console.log('[UpdateNotifier] New service worker found, monitoring state...');
        newWorker.addEventListener('statechange', () => {
          // Quando o novo SW termina de instalar e fica "waiting", aplica a atualização
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[UpdateNotifier] New service worker installed and waiting.');
            applyUpdate(newWorker);
          }
        });
      });
    });

    // Verifica logo no mount para reduzir tempo até detectar um novo deploy.
    checkForUpdates();

    // Verifica atualizações periodicamente (mais agressivo para reduzir necessidade de refresh manual)
    const intervalId = setInterval(checkForUpdates, 5 * 60 * 1000);

    // Também verifica quando o app volta ao foco/foreground ou a conexão retorna.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    const handleWindowFocus = () => {
      checkForUpdates();
    };

    const handleOnline = () => {
      checkForUpdates();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
      if (controllerChangeListenerAdded.current) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, [toast, dismiss]);

  // Componente puramente lógico — não renderiza nada na tela
  return null;
}
