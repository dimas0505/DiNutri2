import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function UpdateNotifier() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const { toast, dismiss } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (!registration) return;

        // Verifica se já existe um worker esperando na inicialização
        // Isso pode acontecer se o usuário recarregou a página e há uma atualização pendente
        if (registration.waiting) {
          console.log('UpdateNotifier: Found waiting service worker on startup, automatically updating...');
          setWaitingWorker(registration.waiting);
          handleAutomaticUpdate(registration.waiting);
        }
      });
    }
  }, []);

  const handleAutomaticUpdate = (worker: ServiceWorker) => {
    // Show informative toast to user about automatic update
    const { id } = toast({
      title: 'Atualização em andamento...',
      description: 'O aplicativo está sendo atualizado para a versão mais recente. A página será recarregada em breve.',
    });

    // Dismiss the toast after 5 seconds
    setTimeout(() => {
      dismiss(id);
    }, 5000);

    // Garante que a página recarregue assim que o novo worker assumir
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('UpdateNotifier: Controller changed, reloading page...');
      window.location.reload();
    });

    // Envia a mensagem para o worker em espera automaticamente
    console.log('UpdateNotifier: Automatically sending SKIP_WAITING message to service worker');
    worker.postMessage({ action: 'SKIP_WAITING' });
  };

  // Este componente é puramente lógico e não renderiza nada na tela
  return null;
}