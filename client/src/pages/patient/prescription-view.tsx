import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Printer, ArrowLeft, Utensils, Info, AlertTriangle, Clock, XCircle } from "lucide-react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MealViewer from "@/components/prescription/meal-viewer";
import MealMenuScreen from "@/components/meal/meal-menu-screen";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Prescription, MealData, MealItemData, Patient, PrescriptionWithExpirationStatus } from "@shared/schema";
import { MobileLayout, DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeaderDNutri } from "@/components/ui/header-dinutri";
import { MealCard } from "@/components/ui/meal-card";
import { DNutriBottomNav } from "@/components/ui/dinutri-bottom-nav";
import { ProfileModal } from "@/components/ui/profile-modal";

export default function PatientPrescriptionView() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionWithExpirationStatus | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealData | null>(null);
  const [showFullScreenMenu, setShowFullScreenMenu] = useState(false);
  const [isSubstitutesModalOpen, setIsSubstitutesModalOpen] = useState(false);
  const [selectedItemForSubstitutes, setSelectedItemForSubstitutes] = useState<MealItemData | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Você precisa estar logado. Redirecionando...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: prescriptions = [], isLoading: prescriptionLoading, error } = useQuery<PrescriptionWithExpirationStatus[]>({
    queryKey: ["/api/patient/my-prescriptions"],
    enabled: !!user,
    retry: false,
  });

  // Buscar dados do paciente para obter patientId - corrigido
  const { data: currentPatient } = useQuery<Patient>({
    queryKey: ["/api/patient/my-profile"],
    enabled: !!user && user.role === 'patient',
    retry: false,
  });

  // Adicione esta lógica logo após o useQuery do currentPatient
  const goalMap = {
    lose_weight: "Perder Peso",
    maintain_weight: "Manter Peso",
    gain_weight: "Ganhar Peso",
  };

  const patientGoal = currentPatient?.goal as keyof typeof goalMap | undefined;
  const goalText = patientGoal && goalMap[patientGoal] 
    ? `Objetivo: ${goalMap[patientGoal]}` 
    : "Seu Plano Alimentar";

  useEffect(() => {
    if (prescriptions.length > 0 && !selectedPrescription) {
      // Prioritize non-expired prescriptions
      const activePrescriptions = prescriptions.filter(p => !p.isExpired);
      const prescriptionToSelect = activePrescriptions.length > 0 ? activePrescriptions[0] : prescriptions[0];
      setSelectedPrescription(prescriptionToSelect);
    }
  }, [prescriptions, selectedPrescription]);

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Não autorizado",
        description: "Você foi desconectado. Fazendo login novamente...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);
  
  const handleOpenSubstitutes = (item: MealItemData) => {
    setSelectedItemForSubstitutes(item);
    setIsSubstitutesModalOpen(true);
  };

  const handleSelectPrescription = (prescriptionId: string) => {
    const pres = prescriptions.find(p => p.id === prescriptionId);
    if (pres) {
      setSelectedPrescription(pres);
      setSelectedMeal(null); // Reset meal selection when changing prescription
    }
  };
  
  const handlePrint = () => {
    if (selectedPrescription) {
      setLocation(`/prescriptions/${selectedPrescription.id}/print`);
    }
  };

  // Ao clicar na refeição, abrir diretamente na tela cheia (apenas se não estiver expirada)
  const handleMealClick = (meal: MealData) => {
    if (selectedPrescription?.isExpired) {
      toast({
        title: "Acesso Negado",
        description: "Esta prescrição expirou. Entre em contato com seu nutricionista para renovar seu plano.",
        variant: "destructive",
      });
      return;
    }
    setSelectedMeal(meal);
    setShowFullScreenMenu(true);
  };

  const handleCloseFullScreenMenu = () => {
    setShowFullScreenMenu(false);
    setSelectedMeal(null);
  };

  const pageContent = () => {
    if (isLoading || prescriptionLoading) {
      return (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando prescrições...</p>
        </div>
      );
    }
  
    if (prescriptions.length === 0) {
      return (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Você ainda não possui uma prescrição publicada.</p>
            <p className="text-sm text-muted-foreground">Entre em contato com seu nutricionista.</p>
          </CardContent>
        </Card>
      );
    }

    // Se uma refeição foi selecionada, mostrar a tela completa do menu da refeição (apenas se não expirada)
    if (selectedMeal && selectedPrescription && showFullScreenMenu && !selectedPrescription.isExpired) {
      return (
        <MealMenuScreen
          meal={selectedMeal}
          prescriptionId={selectedPrescription.id}
          patientId={currentPatient?.id || ""}
          onClose={handleCloseFullScreenMenu}
        />
      );
    }

    // Lista de refeições
    return (
      <div className="p-4 md:p-0">
        {/* Expiration warnings and blocking */}
        {selectedPrescription?.isExpired && (
          <Alert className="mb-6 border-red-500 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Prescrição Expirada</strong>
              <p className="mt-1">
                Sua prescrição expirou em {selectedPrescription.expiresAt ? new Date(selectedPrescription.expiresAt).toLocaleDateString('pt-BR') : 'data não especificada'}. 
                Entre em contato com seu nutricionista para renovar seu plano alimentar e continuar sua evolução.
              </p>
            </AlertDescription>
          </Alert>
        )}
        
        {selectedPrescription?.isExpiringWithin7Days && !selectedPrescription?.isExpired && (
          <Alert className="mb-6 border-orange-500 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Atenção: Prescrição expirando em breve</strong>
              <p className="mt-1">
                Sua prescrição expirará em {selectedPrescription.daysUntilExpiration} dia{selectedPrescription.daysUntilExpiration !== 1 ? 's' : ''} 
                ({selectedPrescription.expiresAt ? new Date(selectedPrescription.expiresAt).toLocaleDateString('pt-BR') : 'data não especificada'}). 
                É imprescindível a renovação do plano para continuar a evolução. Entre em contato com seu nutricionista.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={selectedPrescription?.id} onValueChange={handleSelectPrescription} className="w-full">
          <TabsList>
            {prescriptions.map(p => (
              <TabsTrigger 
                key={p.id} 
                value={p.id}
                className={p.isExpired ? "opacity-50" : ""}
              >
                {p.title}
                {p.isExpired && <XCircle className="ml-2 h-3 w-3" />}
                {p.isExpiringWithin7Days && !p.isExpired && <Clock className="ml-2 h-3 w-3 text-orange-500" />}
              </TabsTrigger>
            ))}
          </TabsList>
        
          <div className="space-y-4 mt-6">
            {selectedPrescription?.isExpired ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-8 text-center">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Acesso Bloqueado</h3>
                  <p className="text-red-700 mb-4">
                    Esta prescrição expirou e não está mais disponível. Para continuar seu acompanhamento nutricional, 
                    entre em contato com seu nutricionista para renovar seu plano.
                  </p>
                  <Button 
                    variant="outline" 
                    className="border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => {
                      toast({
                        title: "Contato com Nutricionista",
                        description: "Entre em contato através do email ou telefone fornecido em consultas anteriores.",
                      });
                    }}
                  >
                    Como Renovar Meu Plano?
                  </Button>
                </CardContent>
              </Card>
            ) : (
              selectedPrescription?.meals.map(meal => (
                <MealCard
                  key={meal.id}
                  title={meal.name}
                  icon={Utensils}
                  onClick={() => handleMealClick(meal)}
                />
              ))
            )}
          </div>
        </Tabs>
      </div>
    );
  };
  
  if (isMobile) {
    // Se estiver mostrando a tela completa do menu da refeição, renderizar fora do layout customizado (apenas se não expirada)
    if (selectedMeal && selectedPrescription && showFullScreenMenu && !selectedPrescription.isExpired) {
      return (
        <MealMenuScreen
          meal={selectedMeal}
          prescriptionId={selectedPrescription.id}
          patientId={currentPatient?.id || ""}
          onClose={handleCloseFullScreenMenu}
        />
      );
    }

    // Layout customizado para o mockup
    return (
      <div className="min-h-screen bg-background">
        {/* Header customizado com gradiente */}
        <HeaderDNutri 
          onProfileClick={() => setIsProfileModalOpen(true)} 
          goalText={goalText} 
        />
        
        {/* Área de conteúdo com cantos superiores arredondados */}
        <main className="bg-white rounded-t-2xl -mt-2 min-h-screen pt-6 pb-20">
          {pageContent()}
        </main>

        {/* Bottom navigation customizada */}
        <DNutriBottomNav 
          activeItem="prescription" 
          onItemClick={(item) => {
            if (item === "home") setLocation("/");
            else if (item === "prescription") setLocation("/patient/prescription");
            else if (item === "profile") {
              // Open profile modal instead of logout confirmation
              setIsProfileModalOpen(true);
            }
          }}
        />

        {/* Profile Modal */}
        <ProfileModal 
          open={isProfileModalOpen}
          onOpenChange={setIsProfileModalOpen}
          patient={currentPatient || null}
        />

        {/* Modal de substituições */}
        <Dialog open={isSubstitutesModalOpen} onOpenChange={setIsSubstitutesModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opções de Substituição para: {selectedItemForSubstitutes?.description}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {selectedItemForSubstitutes?.substitutes?.map((sub, index) => (
                <Card key={index}><CardContent className="p-3">{sub}</CardContent></Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Minha Prescrição"
        rightElement={
          <Button
            onClick={handlePrint}
            className="flex items-center space-x-2"
            disabled={!selectedPrescription}
            data-testid="button-print-prescription"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir</span>
          </Button>
        }
      />
      <main className="max-w-xl mx-auto p-4 lg:p-6">
        {pageContent()}
      </main>

      {/* Modal de substituições */}
      <Dialog open={isSubstitutesModalOpen} onOpenChange={setIsSubstitutesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opções de Substituição para: {selectedItemForSubstitutes?.description}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {selectedItemForSubstitutes?.substitutes?.map((sub, index) => (
              <Card key={index}><CardContent className="p-3">{sub}</CardContent></Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}