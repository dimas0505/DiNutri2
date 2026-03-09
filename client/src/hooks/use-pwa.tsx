import { useState, useEffect } from 'react';

interface PWAInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<PWAInstallEvent | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    // Check if PWA is supported
    const checkSupported = () => {
      setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as PWAInstallEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      // Solicitar permissão de notificação automaticamente após instalar o app
      // Aguarda 3 segundos para o app terminar de abrir
      setTimeout(() => {
        if (
          'Notification' in window &&
          Notification.permission === 'default' &&
          'serviceWorker' in navigator &&
          'PushManager' in window
        ) {
          Notification.requestPermission().then((result) => {
            console.log('[PWA] Permissão de notificação após instalação:', result);
          });
        }
      }, 3000);
    };

    checkInstalled();
    checkSupported();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  return {
    isInstalled,
    isSupported,
    canInstall: !!installPrompt,
    install,
  };
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return Promise.resolve(null);
  }

  // Only register the SW here. All update detection and application
  // is handled exclusively by the UpdateNotifier component to avoid
  // duplicate SKIP_WAITING calls that would cause a double-reload loop.
  return navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      console.log('Service Worker registered successfully:', registration);
      return registration;
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
      return null;
    });
}
