import { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DiNutriLogo } from './ui/dinutri-logo';

// Função para detectar se o dispositivo é iOS
const isIos = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

// Função para verificar se o app já está em modo PWA
const isInStandaloneMode = () =>
  'standalone' in window.navigator && (window.navigator as any).standalone;

export default function IosInstallToast() {
  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const toastDismissed = localStorage.getItem('iosInstallToastDismissed');

    // Mostra o toast apenas se for iOS, não estiver em modo standalone e não tiver sido dispensado
    if (isIos() && !isInStandaloneMode() && !toastDismissed) {
      setShowToast(true);
    }
  }, []);

  const handleDismiss = () => {
    // Lembra que o usuário dispensou o aviso por 1 semana
    localStorage.setItem('iosInstallToastDismissed', 'true'); // TTL pode ser adicionado se necessário
    setShowToast(false);
  };

  if (!showToast) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-background text-foreground p-4 rounded-lg shadow-2xl border animate-slide-in-up z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DiNutriLogo variant="icon" className="h-10 w-10" />
            <div>
              <p className="font-bold text-sm">Instale nosso App!</p>
              <p className="text-xs text-muted-foreground">Tenha a melhor experiência no seu iPhone.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              Ver Como
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDismiss} className="h-8 w-8">
              <X size={16} />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar o Aplicativo no seu iPhone</DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para adicionar o DiNutri à sua tela de início.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 bg-primary/10 text-primary p-2 rounded-lg">
                <Share className="h-6 w-6" />
              </div>
              <p>1. Toque no botão de <strong>Compartilhar</strong> na barra de ferramentas do Safari.</p>
            </div>
            <div className="flex items-center space-x-4">
               <div className="flex-shrink-0 bg-primary/10 text-primary p-2 rounded-lg">
                <PlusSquare className="h-6 w-6" />
              </div>
              <p>2. Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</p>
            </div>
             <div className="flex items-center space-x-4">
               <div className="flex-shrink-0 bg-primary/10 text-primary p-2 rounded-lg">
                 <DiNutriLogo variant='icon' className="h-6 w-6" />
              </div>
              <p>3. Toque em <strong>"Adicionar"</strong> no canto superior direito para confirmar.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}