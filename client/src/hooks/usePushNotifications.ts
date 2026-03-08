// ARQUIVO: ./client/src/hooks/usePushNotifications.ts
// Hook para gerenciar notificações push no frontend (Web Push API)

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
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
  
  // Ref para rastrear o estado anterior e evitar updates desnecessários
  const permissionRef = useRef<PermissionState>('default');

  /**
   * Sincroniza o estado da permissão e da assinatura com a realidade do navegador.
   * 
   * @param forceReload Se true, recarrega a página caso a permissão ainda pareça 'denied'.
   * Isso é necessário em PWAs Android/iOS onde o navegador cacheia o estado da permissão
   * e só o atualiza após um refresh completo.
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

  /**
   * Solicita permissão ao usuário e registra a assinatura push no servidor.
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      await refreshPermission();

      if (result !== 'granted') {
        return false;
      }

      const vapidResponse = await fetch('/api/push/vapid-public-key');
      if (!vapidResponse.ok) return false;
      const { publicKey } = await vapidResponse.json();

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = subscription.toJSON();
      await apiRequest('POST', '/api/push/subscribe', {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
      });

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('[PushNotifications] Erro ao assinar:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshPermission]);

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

  return { 
    permission, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe,
    refreshPermission 
  };
}
