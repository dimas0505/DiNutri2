import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Printer, ArrowLeft, Utensils, Info } from "lucide-react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        <div className="text-center p-12">
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 absolute top-0 left-0"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Carregando suas prescrições...
          </h3>
          <p className="text-gray-600 text-sm">
            Aguarde enquanto preparamos seu plano alimentar
          </p>
        </div>
      );
    }
  
    if (prescriptions.length === 0) {
      return (
        <div className="text-center p-12">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Nenhuma prescrição encontrada
          </h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto leading-relaxed">
            Você ainda não possui uma prescrição nutricional publicada. Entre em contato com seu nutricionista para receber seu plano alimentar personalizado.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto">
            <p className="text-blue-800 text-sm">
              💡 <strong>Dica:</strong> Assim que seu nutricionista publicar sua prescrição, ela aparecerá aqui automaticamente.
            </p>
          </div>
        </div>
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
      <div className="p-4 md:p-6">
        {/* Header section with prescription selection */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Minha Prescrição Nutricional
            </h1>
            <p className="text-gray-600 text-sm">
              Selecione uma prescrição e navegue pelas suas refeições
            </p>
          </div>
          
          {prescriptions.length > 1 && (
            <Tabs value={selectedPrescription?.id} onValueChange={handleSelectPrescription} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 bg-gray-100 p-1 rounded-xl">
                {prescriptions.map(p => (
                  <TabsTrigger 
                    key={p.id} 
                    value={p.id}
                    className="rounded-lg font-medium text-sm py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    {p.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Meals grid section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Suas Refeições ({selectedPrescription?.meals.length || 0})
            </h2>
            <div className="text-sm text-gray-500">
              Toque para ver detalhes
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {selectedPrescription?.meals.map((meal, index) => (
              <div
                key={meal.id}
                className="group relative"
              >
                {/* Meal number badge */}
                <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                  {index + 1}
                </div>
                
                <MealCard
                  title={meal.name}
                  icon={Utensils}
                  onClick={() => handleMealClick(meal)}
                  className="transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-lg border-l-4 border-l-purple-400 bg-gradient-to-r from-white to-purple-50/30"
                />
                
                {/* Meal items count */}
                <div className="absolute bottom-2 right-4 text-xs text-white/90 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                  {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'}
                </div>
              </div>
            ))}
          </div>
          
          {/* General notes section */}
          {selectedPrescription?.generalNotes && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Observações Gerais
                  </h3>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    {selectedPrescription.generalNotes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
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
        <main className="bg-white rounded-t-2xl -mt-2 min-h-screen pt-8 pb-24 px-1">
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
      <main className="max-w-4xl mx-auto p-4 lg:p-8">
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