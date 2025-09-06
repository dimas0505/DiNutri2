import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
          console.log('UpdateNotifier: Found waiting service worker on startup');
          setWaitingWorker(registration.waiting);
          showUpdateNotification(registration.waiting);
        }
      });
    }
  }, []);

  const showUpdateNotification = (worker: ServiceWorker) => {
    const { id } = toast({
      title: 'Atualização Disponível',
      description: 'Uma nova versão do aplicativo está pronta para ser instalada.',
      action: (
        <Button onClick={() => handleUpdate(id, worker)}>
          Atualizar Agora
        </Button>
      ),
    });
  };

  const handleUpdate = (toastId: string, worker: ServiceWorker) => {
    // Fecha a notificação
    dismiss(toastId);

    // Garante que a página recarregue assim que o novo worker assumir
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('UpdateNotifier: Controller changed, reloading page...');
      window.location.reload();
    });

    // Envia a mensagem para o worker em espera
    console.log('UpdateNotifier: Sending SKIP_WAITING message to service worker');
    worker.postMessage({ action: 'SKIP_WAITING' });
  };

  // Este componente é puramente lógico e não renderiza nada na tela
  return null;
}