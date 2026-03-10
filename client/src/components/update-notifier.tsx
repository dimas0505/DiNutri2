import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * UpdateNotifier — Componente responsável por detectar e aplicar atualizações
 * do Service Worker de forma automática e transparente.
 *
 * Estratégia de detecção:
 * 1. Verifica atualizações imediatamente ao montar.
 * 2. Verifica a cada 2 minutos (intervalo reduzido para captar deploys rápido).
 * 3. Verifica quando o app volta ao foco (visibilitychange / focus).
 * 4. Verifica quando a conexão retorna (online).
 * 5. Quando detecta um SW "waiting", envia SKIP_WAITING automaticamente
 *    e recarrega a página assim que o novo controller assumir.
 */
export function UpdateNotifier() {
  const { toast, dismiss } = useToast();
  const controllerChangeListenerAdded = useRef(false);
  const isReloading = useRef(false);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Debounce: evita múltiplas verificações em sequência rápida (ex: focus + visibility)
    const checkForUpdates = async () => {
      const now = Date.now();
      if (now - lastCheckRef.current < 5_000) return; // mínimo 10s entre checks
      lastCheckRef.current = now;

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
      if (isReloading.current) return;
      isReloading.current = true;
      console.log('[UpdateNotifier] Controller changed, reloading page...');
      window.location.reload();
    };

    const applyUpdate = (worker: ServiceWorker) => {
      console.log('[UpdateNotifier] Applying update from waiting service worker...');

      if (!controllerChangeListenerAdded.current) {
        controllerChangeListenerAdded.current = true;
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      }

      // Se já estamos tentando recarregar, não mostre outro toast
      if (isReloading.current) return;

      toast({
        title: 'Nova atualização instalada!',
        description: 'O aplicativo foi atualizado para a versão mais recente e será recarregado.',
      });

      // Instrui o SW em espera a assumir o controle imediatamente
      worker.postMessage({ action: 'SKIP_WAITING' });
      
      // Fallback: se o controllerchange não disparar em 3 segundos, force o reload
      setTimeout(() => {
        if (!isReloading.current) {
          console.log('[UpdateNotifier] Timeout waiting for controllerchange, forcing reload...');
          handleControllerChange();
        }
      }, 3000);
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
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[UpdateNotifier] New service worker installed and waiting.');
            applyUpdate(newWorker);
          }
        });
      });
    });

    // Verifica logo no mount
    checkForUpdates();

    // Polling a cada 2 minutos (mais agressivo que 5 min para captar deploys rápido)
    const intervalId = setInterval(checkForUpdates, 30 * 1000);

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

  return null;
}
