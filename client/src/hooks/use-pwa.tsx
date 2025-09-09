import { useState, useEffect } from 'react';
import { toast } from './use-toast';

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

  // Add a listener for messages from the service worker to handle the reload
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'SW_UPDATED') {
      console.log('SW_UPDATED message received, reloading window...');
      window.location.reload();
    }
  });

  return navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      console.log('Service Worker registered successfully:', registration);
      
      // Set up periodic update checking (every hour)
      setInterval(() => {
        console.log('Checking for service worker updates...');
        registration.update();
      }, 1000 * 60 * 60); // 1 hour
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available - automatically update
              console.log('New SW version available, starting automatic update...');
              
              // Show informative toast to user about automatic update
              const toastResult = toast({
                title: "Atualização em andamento...",
                description: "O aplicativo está sendo atualizado para a versão mais recente. A página será recarregada em breve.",
              });
              
              // Dismiss the toast after 5 seconds
              setTimeout(() => {
                toastResult.dismiss();
              }, 5000);
              
              // Automatically trigger the update without user interaction
              console.log('Automatically sending SKIP_WAITING message');
              newWorker.postMessage({ action: 'SKIP_WAITING' });
            }
          });
        }
      });

      return registration;
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
      return null;
    });
}