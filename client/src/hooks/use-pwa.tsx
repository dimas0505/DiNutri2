import { useState, useEffect } from 'react';
import { toast } from './use-toast';
import { isMobileDevice, isTouchDevice } from '@/utils/mobile';
import { Button } from '@/components/ui/button';

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

  return navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      console.log('Service Worker registered successfully:', registration);
      
      // Debug: Log current cache versions
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          console.log('Current cache names:', cacheNames);
        });
      }
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              const isMobile = isMobileDevice() || isTouchDevice();
              
              console.log('New SW version available, isMobile:', isMobile);
              
              if (isMobile) {
                // Show toast notification for mobile users
                toast({
                  title: "🎉 Nova versão disponível!",
                  description: "Toque para atualizar o aplicativo agora.",
                  action: (
                    <Button
                      size="sm"
                      onClick={() => {
                        console.log('Update button clicked, sending SKIP_WAITING message');
                        newWorker.postMessage({ action: 'SKIP_WAITING' });
                        
                        // Add a small delay before reload to ensure message is processed
                        setTimeout(() => {
                          window.location.reload();
                        }, 100);
                      }}
                    >
                      Atualizar
                    </Button>
                  ),
                });
              } else {
                // Fallback to confirm dialog for desktop
                if (confirm('Nova versão disponível. Atualizar agora?')) {
                  console.log('Desktop update confirmed, sending SKIP_WAITING message');
                  newWorker.postMessage({ action: 'SKIP_WAITING' });
                  setTimeout(() => {
                    window.location.reload();
                  }, 100);
                }
              }
            }
          });
        }
      });

      // Listen for controllerchange but don't auto-reload to allow toast interaction
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
        // Don't auto-reload here - let the user decide via the toast or confirm dialog
      });

      return registration;
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
      return null;
    });
}