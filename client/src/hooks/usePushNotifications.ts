// ARQUIVO: ./client/src/hooks/usePushNotifications.ts
// Hook para gerenciar notificações push no frontend (Web Push API)
//
// SOLUÇÃO DEFINITIVA (Google - Finalização Manual):
// - Contorna a restrição "User Gesture Requirement" dos navegadores
// - Usa needsFinalization para sinalizar quando o usuário precisa clicar para finalizar
// - Garante que subscribe() seja chamado dentro de um evento de clique
// - Usa sessionStorage para persistir intenção de assinatura após reload
// - Sincronização global entre componentes via eventos

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  needsFinalization: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
  refreshPermission: (forceReload?: boolean) => Promise<void>;
}

/**
 * Converte uma string base64url para Uint8Array.
 * Necessário para passar a chave VAPID ao PushManager.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsFinalization, setNeedsFinalization] = useState(false);
  
  // Ref para rastrear o estado anterior e evitar updates desnecessários
  const permissionRef = useRef<PermissionState>('default');

  // Cache da chave VAPID para evitar fetch durante o fluxo de subscribe (User Gesture)
  const vapidKeyRef = useRef<string | null>(null);

  /**
   * Sincroniza o estado da permissão e da assinatura com a realidade do navegador.
   */
  const refreshPermission = useCallback(async (forceReload = false) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      permissionRef.current = 'unsupported';
      return;
    }

    const currentPermission = Notification.permission as PermissionState;
    console.log(`[PushNotifications] Verificando permissão: ${currentPermission}`);
    
    // Se o usuário clicou no botão manual e a permissão ainda é 'denied',
    // forçamos um reload da página. É a única forma garantida de limpar o cache
    // de permissão do navegador em modo PWA.
    if (forceReload && currentPermission === 'denied') {
      console.log('[PushNotifications] Forçando recarregamento da página para atualizar permissão...');
      window.location.reload();
      return;
    }

    // Só atualiza se houver mudança real
    if (permissionRef.current !== currentPermission) {
      setPermission(currentPermission);
      permissionRef.current = currentPermission;
    }

    // Se a permissão não for 'denied', verifica assinatura
    if (currentPermission !== 'denied') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch (err) {
        console.error('[PushNotifications] Erro ao verificar assinatura:', err);
      }
    } else {
      setIsSubscribed(false);
    }
  }, []);

  // Verificar suporte e estado inicial
  useEffect(() => {
    refreshPermission();

    // 1. Permissions API (Reativo)
    let permissionStatus: PermissionStatus | null = null;
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
        permissionStatus = status;
        status.onchange = () => {
          console.log('[PushNotifications] Evento onchange da Permissions API');
          refreshPermission();
        };
      }).catch(() => {
        // Fallback silencioso
      });
    }

    // 2. Visibility Change (Foco do App)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[PushNotifications] App voltou ao foco, revalidando permissão...');
        refreshPermission();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [refreshPermission]);

  // Pré-carregar a chave VAPID assim que o hook montar para evitar fetch durante o subscribe()
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    fetch('/api/push/vapid-public-key')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.publicKey) {
          vapidKeyRef.current = data.publicKey;
        }
      })
      .catch((err) => {
        console.warn('[PushNotifications] Falha ao pré-carregar chave VAPID:', err);
        // Será tentado novamente dentro do subscribe() se necessário
      });
  }, []);

  /**
   * Solicita permissão ao usuário e registra a assinatura push no servidor.
   * IMPORTANTE: Esta função deve ser chamada dentro de um evento de clique (user gesture)
   * para contornar a restrição de segurança do navegador.
   *
   * Modelo Fast-Track: mínimo de awaits antes do pushManager.subscribe() para preservar
   * o User Gesture Context do navegador.
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    setIsLoading(true);
    try {
      // 1. Solicitar permissão SE ainda não concedida (único await antes do subscribe)
      let result = Notification.permission;
      if (result === 'default') {
        result = await Notification.requestPermission();
      }

      // 2. Verificar se permissão foi concedida
      if (result !== 'granted') {
        return false;
      }

      // 3. Obter a chave VAPID do cache (sem await se já disponível)
      let publicKey = vapidKeyRef.current;
      if (!publicKey) {
        const vapidResponse = await fetch('/api/push/vapid-public-key');
        if (!vapidResponse.ok) return false;
        const data = await vapidResponse.json();
        publicKey = data.publicKey;
        vapidKeyRef.current = publicKey;
      }

      if (!publicKey) return false;

      // 4. Aguardar Service Worker pronto
      const registration = await navigator.serviceWorker.ready;

      // 5. Limpar assinatura antiga/corrompida antes de criar nova
      try {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
        }
      } catch (unsubErr) {
        console.warn('[PushNotifications] Falha ao remover assinatura anterior (continuando):', unsubErr);
      }

      // 6. Criar nova assinatura (o clique ainda está "vivo" aqui)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 7. Registrar assinatura no servidor
      const subJson = subscription.toJSON();
      await apiRequest('POST', '/api/push/subscribe', {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
      });

      // 8. Atualizar estados e disparar evento de sincronização
      setIsSubscribed(true);
      setNeedsFinalization(false);
      
      // Limpar a flag de finalização
      sessionStorage.removeItem('PENDING_PUSH_SUBSCRIBE');
      
      // Avisa todas as outras instâncias do hook que a subscrição mudou
      window.dispatchEvent(new Event('push-subscription-changed'));
      
      return true;
    } catch (error) {
      console.error('[PushNotifications] Erro ao assinar:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cancela a assinatura push.
   */
  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await apiRequest('DELETE', '/api/push/unsubscribe', { endpoint });
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('[PushNotifications] Erro ao cancelar:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sincronização global entre instâncias + detecção de finalização necessária
  useEffect(() => {
    // 1. Ouvir evento global de sincronização entre componentes
    const handleSync = () => refreshPermission(false);
    window.addEventListener('push-subscription-changed', handleSync);

    // 2. Detectar quando a permissão foi concedida após reload (necessita finalização manual)
    // O navegador bloqueia subscribe() sem um clique do usuário, então sinalizamos para o componente
    const checkPendingSubscription = () => {
      const pending = sessionStorage.getItem('PENDING_PUSH_SUBSCRIBE');
      if (pending === 'true') {
        console.log('[PushNotifications] Flag PENDING_PUSH_SUBSCRIBE encontrada. Verificando permissão após reload...');
        
        // Se a permissão já é granted após o reload, sinalizamos que precisa finalizar
        if (Notification.permission === 'granted' && !isSubscribed) {
          console.log('[PushNotifications] Permissão granted após reload. Aguardando clique do usuário para finalizar...');
          setNeedsFinalization(true);
        } else if (Notification.permission !== 'granted') {
          // Se ainda não foi concedida, limpamos a flag
          sessionStorage.removeItem('PENDING_PUSH_SUBSCRIBE');
          setNeedsFinalization(false);
        }
      }
    };

    checkPendingSubscription();

    return () => {
      window.removeEventListener('push-subscription-changed', handleSync);
    };
  }, [isSubscribed]);

  return { 
    permission, 
    isSubscribed, 
    isLoading, 
    needsFinalization,
    subscribe, 
    unsubscribe,
    refreshPermission 
  };
}
