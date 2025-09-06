import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Printer, ArrowLeft, Utensils, Info } from "lucide-react";
// TODO: Restore after database migration: Clock, AlertTriangle, format, isAfter, differenceInDays, ptBR
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import MealViewer from "@/components/prescription/meal-viewer";
import MealMenuScreen from "@/components/meal/meal-menu-screen";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Prescription, MealData, MealItemData, Patient } from "@shared/schema";
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
  
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealData | null>(null);
  const [showFullScreenMenu, setShowFullScreenMenu] = useState(false);
  const [isSubstitutesModalOpen, setIsSubstitutesModalOpen] = useState(false);
  const [selectedItemForSubstitutes, setSelectedItemForSubstitutes] = useState<MealItemData | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // TODO: Restore after database migration
  // Utility functions for prescription expiration
  const isPrescriptionExpired = (prescription: Prescription): boolean => {
    // Temporarily disabled until database migration is complete
    return false;
    // if (!prescription.expiresAt) return false;
    // return isAfter(new Date(), new Date(prescription.expiresAt));
  };

  const getDaysUntilExpiration = (prescription: Prescription): number | null => {
    // Temporarily disabled until database migration is complete
    return null;
    // if (!prescription.expiresAt) return null;
    // return differenceInDays(new Date(prescription.expiresAt), new Date());
  };

  // TODO: Restore after database migration
  /*
  const getExpirationStatus = (prescription: Prescription) => {
    if (!prescription.expiresAt) return null;
    
    const daysUntilExpiration = getDaysUntilExpiration(prescription);
    const isExpired = isPrescriptionExpired(prescription);
    
    if (isExpired) {
      return {
        type: 'expired' as const,
        message: `Expirou em ${format(new Date(prescription.expiresAt), "dd/MM/yyyy", { locale: ptBR })}`,
        variant: 'destructive' as const,
        icon: AlertTriangle
      };
    } else if (daysUntilExpiration !== null && daysUntilExpiration <= 7) {
      return {
        type: 'expiring-soon' as const,
        message: daysUntilExpiration === 0 
          ? 'Expira hoje'
          : daysUntilExpiration === 1 
            ? 'Expira amanhã'
            : `Expira em ${daysUntilExpiration} dias`,
        variant: 'default' as const,
        icon: Clock
      };
    }
    
    return null;
  };
  */
  const getExpirationStatus = (prescription: Prescription) => {
    // Temporarily disabled until database migration is complete
    return null;
  };

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

  const { data: prescriptions = [], isLoading: prescriptionLoading, error } = useQuery<Prescription[]>({
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
      setSelectedPrescription(prescriptions[0]);
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

  // Ao clicar na refeição, abrir diretamente na tela cheia
  const handleMealClick = (meal: MealData) => {
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

    // Se uma refeição foi selecionada, mostrar a tela completa do menu da refeição
    if (selectedMeal && selectedPrescription && showFullScreenMenu) {
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
        <Tabs value={selectedPrescription?.id} onValueChange={handleSelectPrescription} className="w-full">
          <TabsList>
            {prescriptions.map(p => {
              // TODO: Restore after database migration
              // const expirationStatus = getExpirationStatus(p);
              return (
                <TabsTrigger key={p.id} value={p.id} className="relative">
                  {p.title}
                  {/* TODO: Restore after database migration
                  {expirationStatus && (
                    <Badge 
                      variant={expirationStatus.variant === 'destructive' ? 'destructive' : 'secondary'} 
                      className="ml-2 text-xs"
                    >
                      {expirationStatus.type === 'expired' ? 'Expirada' : 'Expira em breve'}
                    </Badge>
                  )}
                  */}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {/* TODO: Restore after database migration - Expiration warning for selected prescription
          {selectedPrescription && (() => {
            const expirationStatus = getExpirationStatus(selectedPrescription);
            if (!expirationStatus) return null;
            
            const IconComponent = expirationStatus.icon;
            
            return (
              <Alert className={`mt-4 ${expirationStatus.variant === 'destructive' ? 'border-destructive' : 'border-yellow-500'}`}>
                <IconComponent className="h-4 w-4" />
                <AlertDescription>
                  <strong>
                    {expirationStatus.type === 'expired' ? 'Prescrição Expirada: ' : 'Atenção: '}
                  </strong>
                  {expirationStatus.message}
                  {expirationStatus.type === 'expired' && (
                    <span className="block mt-1 text-sm">
                      Entre em contato com seu nutricionista para renovar sua prescrição.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            );
          })()}
          */}
        
          <div className="space-y-4 mt-6">
            {selectedPrescription?.meals.map(meal => {
              const isExpired = isPrescriptionExpired(selectedPrescription);
              return (
                <MealCard
                  key={meal.id}
                  title={meal.name}
                  icon={Utensils}
                  onClick={() => {
                    if (isExpired) {
                      toast({
                        title: "Prescrição Expirada",
                        description: "Esta prescrição expirou. Entre em contato com seu nutricionista.",
                        variant: "destructive",
                      });
                      return;
                    }
                    handleMealClick(meal);
                  }}
                  className={isExpired ? "opacity-50" : ""}
                />
              );
            })}
          </div>
        </Tabs>
      </div>
    );
  };
  
  if (isMobile) {
    // Se estiver mostrando a tela completa do menu da refeição, renderizar fora do layout customizado
    if (selectedMeal && selectedPrescription && showFullScreenMenu) {
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