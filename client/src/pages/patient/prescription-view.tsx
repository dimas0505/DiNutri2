import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Download, ArrowLeft, Utensils, Info, Clock, AlertTriangle } from "lucide-react";
import { format, isAfter, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  // Utility functions for prescription expiration
  const isPrescriptionExpired = (prescription: Prescription): boolean => {
    if (!prescription.expiresAt) return false;
    return isAfter(new Date(), new Date(prescription.expiresAt));
  };

  const getDaysUntilExpiration = (prescription: Prescription): number | null => {
    if (!prescription.expiresAt) return null;
    const days = differenceInDays(new Date(prescription.expiresAt), new Date());
    return days;
  };

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
  
  const handleDownload = async () => {
    if (!selectedPrescription || !currentPatient) {
      toast({
        title: "Erro",
        description: "Dados da prescrição não encontrados.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a temporary container for the print content
      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.left = '-9999px';
      printContainer.style.top = '0';
      printContainer.style.width = '794px'; // A4 width in pixels at 96 DPI
      printContainer.style.background = 'white';
      printContainer.style.padding = '40px';
      printContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      
      // Mock nutritionist data
      const nutritionist = {
        name: "Dr. Ana Silva",
        crn: "12345",
      };

      // Helper functions
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
        });
      };

      const calculateAge = (birthDate: string) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        const age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          return age - 1;
        }
        return age;
      };

      // Generate the print content HTML
      printContainer.innerHTML = `
        <div style="background: white; color: #111827;">
          <!-- Document Header -->
          <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px;">
            <h1 style="font-size: 28px; font-weight: bold; color: #374151; margin-bottom: 8px; margin-top: 0;">PRESCRIÇÃO NUTRICIONAL</h1>
            <div style="font-size: 18px; color: #6b7280;">
              <div>${nutritionist.name}</div>
              <div style="font-size: 14px;">CRN: ${nutritionist.crn} • Nutricionista</div>
            </div>
          </div>

          <!-- Patient Info -->
          <div style="margin-bottom: 32px; background: #f9fafb; padding: 24px; border-radius: 8px;">
            <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; margin-top: 0;">Dados do Paciente</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
              <div><strong>Nome:</strong> ${currentPatient.name}</div>
              <div><strong>Email:</strong> ${currentPatient.email}</div>
              ${currentPatient.birthDate ? `<div><strong>Idade:</strong> ${calculateAge(currentPatient.birthDate)} anos</div>` : ''}
              ${currentPatient.sex ? `<div><strong>Sexo:</strong> ${currentPatient.sex === 'F' ? 'Feminino' : currentPatient.sex === 'M' ? 'Masculino' : 'Outro'}</div>` : ''}
              ${currentPatient.heightCm ? `<div><strong>Altura:</strong> ${currentPatient.heightCm} cm</div>` : ''}
              ${currentPatient.weightKg ? `<div><strong>Peso:</strong> ${currentPatient.weightKg} kg</div>` : ''}
            </div>
          </div>

          <!-- Prescription Title -->
          <div style="margin-bottom: 32px; text-align: center;">
            <h2 style="font-size: 24px; font-weight: bold; color: #374151; margin-top: 0; margin-bottom: 8px;">
              ${selectedPrescription.title}
            </h2>
            <p style="color: #6b7280; margin-top: 8px; margin-bottom: 0;">
              Publicado em ${selectedPrescription.publishedAt ? formatDate(selectedPrescription.publishedAt.toString()) : ''}
            </p>
          </div>

          <!-- Meals -->
          <div style="margin-bottom: 32px;">
            ${selectedPrescription.meals.map(meal => `
              <div style="margin-bottom: 32px; page-break-inside: avoid;">
                <div style="background: #dbeafe; padding: 16px; border-radius: 8px 8px 0 0; border-left: 4px solid #3b82f6;">
                  <h3 style="font-size: 20px; font-weight: 600; color: #374151; margin: 0;">
                    ${meal.name}
                  </h3>
                </div>
                <div style="border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px; padding: 16px;">
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    ${meal.items.map(item => `
                      <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                        <span style="font-weight: 500;">${item.description}</span>
                        <span style="color: #6b7280;">${item.amount}</span>
                      </li>
                    `).join('')}
                  </ul>
                  ${meal.notes ? `
                    <div style="margin-top: 16px; padding: 12px; background: #fefce8; border-radius: 6px; border-left: 4px solid #facc15;">
                      <p style="font-size: 14px; color: #374151; margin: 0;">
                        <strong>Observação:</strong> ${meal.notes}
                      </p>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          ${selectedPrescription.generalNotes ? `
            <!-- General Notes -->
            <div style="margin-top: 32px; padding: 24px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; margin-top: 0;">Observações Gerais</h3>
              <p style="color: #374151; margin: 0;">
                ${selectedPrescription.generalNotes}
              </p>
            </div>
          ` : ''}

          <!-- Footer -->
          <div style="margin-top: 48px; padding-top: 24px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 14px; color: #6b7280;">
            <p style="margin: 0 0 8px 0;">Esta prescrição foi elaborada especificamente para ${currentPatient.name}.</p>
            <p style="margin: 0 0 16px 0;">Em caso de dúvidas, entre em contato com seu nutricionista.</p>
            <p style="margin: 0; font-weight: 600;">${nutritionist.name} - CRN: ${nutritionist.crn}</p>
          </div>
        </div>
      `;

      // Append to body temporarily
      document.body.appendChild(printContainer);

      // Wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture with html2canvas
      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Remove the temporary container
      document.body.removeChild(printContainer);

      // Generate PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`prescricao-${selectedPrescription.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);

      toast({
        title: "Sucesso",
        description: "PDF baixado com sucesso!",
        variant: "default",
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF. Tente novamente.",
        variant: "destructive",
      });
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
              const expirationStatus = getExpirationStatus(p);
              return (
                <TabsTrigger key={p.id} value={p.id} className="relative">
                  {p.title}
                  {expirationStatus && (
                    <Badge 
                      variant={expirationStatus.variant === 'destructive' ? 'destructive' : 'secondary'} 
                      className="ml-2 text-xs"
                    >
                      {expirationStatus.type === 'expired' ? 'Expirada' : 'Expira em breve'}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
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
            onClick={handleDownload}
            className="flex items-center space-x-2"
            disabled={!selectedPrescription}
            data-testid="button-download-prescription"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
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