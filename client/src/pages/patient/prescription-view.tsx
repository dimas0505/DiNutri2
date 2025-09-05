import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Printer, ArrowLeft, Utensils, Info, ChevronRight, Camera, Heart, FileText } from "lucide-react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Enhanced Meal Card Component with modern design
function EnhancedMealCard({ 
  meal, 
  index, 
  onClick 
}: { 
  meal: MealData; 
  index: number; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      aria-label={`Acessar refeição ${meal.name}`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Icon with glassmorphism effect */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <Utensils className="h-6 w-6 text-white" />
                </div>
              </div>
              {/* Number badge */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                {index}
              </div>
            </div>
            
            <div className="text-left">
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {meal.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Toque para ver detalhes</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
        
        {/* Meal notes preview if available */}
        {meal.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 overflow-hidden" 
               style={{ 
                 display: '-webkit-box',
                 WebkitLineClamp: 2,
                 WebkitBoxOrient: 'vertical'
               }}>
              {meal.notes}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}

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
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/30"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent absolute top-0 left-0" 
                 style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-foreground font-medium">Carregando prescrições...</p>
            <p className="text-sm text-muted-foreground">Aguarde um momento</p>
          </div>
        </div>
      );
    }
  
    if (prescriptions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
              <FileText className="h-10 w-10 text-purple-600" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-foreground">Nenhuma prescrição encontrada</h3>
            <p className="text-muted-foreground max-w-sm">
              Você ainda não possui uma prescrição publicada. Entre em contato com seu nutricionista para obter sua primeira prescrição.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Dica</p>
                <p>Suas prescrições aparecerão aqui assim que seu nutricionista as publicar.</p>
              </div>
            </div>
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
      <div className="p-4 md:p-0 space-y-6">
        {/* Enhanced prescription tabs */}
        <div className="space-y-4">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Suas Prescrições</h2>
            <p className="text-sm text-muted-foreground">
              Selecione uma prescrição para visualizar suas refeições
            </p>
          </div>
          
          <Tabs value={selectedPrescription?.id} onValueChange={handleSelectPrescription} className="w-full">
            <TabsList className="grid w-full grid-cols-1 gap-2 bg-transparent h-auto p-0">
              {prescriptions.map(p => (
                <TabsTrigger 
                  key={p.id} 
                  value={p.id}
                  className="justify-between px-4 py-3 rounded-xl border-2 border-border/50 bg-card hover:bg-accent/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Utensils className="h-4 w-4" />
                      <span className="font-medium">{p.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-white/20 text-current">
                      {p.meals.length} {p.meals.length === 1 ? 'refeição' : 'refeições'}
                    </Badge>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Enhanced meal cards section */}
        {selectedPrescription && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Refeições de {selectedPrescription.title}
              </h3>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {selectedPrescription.meals.length} refeições
              </Badge>
            </div>
            
            <div className="grid gap-4">
              {selectedPrescription.meals.map((meal, index) => (
                <EnhancedMealCard
                  key={meal.id}
                  meal={meal}
                  index={index + 1}
                  onClick={() => handleMealClick(meal)}
                />
              ))}
            </div>
            
            {/* General notes section */}
            {selectedPrescription.generalNotes && (
              <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Info className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-2">Observações Gerais</h4>
                      <p className="text-blue-800 text-sm whitespace-pre-wrap">
                        {selectedPrescription.generalNotes}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
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