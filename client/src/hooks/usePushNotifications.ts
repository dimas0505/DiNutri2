// ARQUIVO: ./client/src/hooks/usePushNotifications.ts
// Hook para gerenciar notificações push no frontend (Web Push API)

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
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

  // Verificar suporte e estado atual ao montar
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    // Ler permissão atual
    setPermission(Notification.permission as PermissionState);

    // Verificar se já há assinatura ativa
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, []);

  /**
   * Solicita permissão ao usuário e registra a assinatura push no servidor.
   * Retorna true se a assinatura foi criada com sucesso.
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[PushNotifications] Não suportado neste navegador.');
      return false;
    }

    setIsLoading(true);
    try {
      // Solicitar permissão
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== 'granted') {
        console.log('[PushNotifications] Permissão negada pelo usuário.');
        return false;
      }

      // Buscar chave pública VAPID do servidor
      const vapidResponse = await fetch('/api/push/vapid-public-key');
      if (!vapidResponse.ok) {
        console.error('[PushNotifications] Servidor não retornou chave VAPID.');
        return false;
      }
      const { publicKey } = await vapidResponse.json();

      // Registrar assinatura no PushManager do Service Worker
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Enviar assinatura ao servidor
      const subJson = subscription.toJSON();
      await apiRequest('POST', '/api/push/subscribe', {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
      });

      setIsSubscribed(true);
      console.log('[PushNotifications] Assinatura registrada com sucesso.');
      return true;
    } catch (error) {
      console.error('[PushNotifications] Erro ao registrar assinatura:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cancela a assinatura push e remove do servidor.
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
        console.log('[PushNotifications] Assinatura cancelada com sucesso.');
      }
    } catch (error) {
      console.error('[PushNotifications] Erro ao cancelar assinatura:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
