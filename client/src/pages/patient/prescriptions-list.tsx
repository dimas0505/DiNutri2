import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Download, ArrowLeft, Clock, AlertTriangle, FileText, Calendar } from "lucide-react";
import { format, isAfter, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Prescription, Patient } from "@shared/schema";
import { MobileLayout, DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeaderDNutri } from "@/components/ui/header-dinutri";
import { DNutriBottomNav } from "@/components/ui/dinutri-bottom-nav";
import { ProfileModal } from "@/components/ui/profile-modal";
import { generatePrescriptionPDF } from "@/utils/pdf-generator";

export default function PatientPrescriptionsList() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  // Buscar dados do paciente para obter patientId
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
    : "Suas Prescrições";

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

  const handleDownload = async (prescription: Prescription) => {
    if (!currentPatient) {
      toast({
        title: "Erro",
        description: "Dados do paciente não encontrados.",
        variant: "destructive",
      });
      return;
    }

    setDownloadingId(prescription.id);

    await generatePrescriptionPDF({
      prescription,
      patient: currentPatient,
      onSuccess: () => {
        toast({
          title: "Sucesso",
          description: "PDF baixado com sucesso!",
          variant: "default",
        });
        setDownloadingId(null);
      },
      onError: (error) => {
        console.error('Error generating PDF:', error);
        toast({
          title: "Erro",
          description: "Erro ao gerar PDF. Tente novamente.",
          variant: "destructive",
        });
        setDownloadingId(null);
      }
    });
  };

  const handleViewPrescription = (prescriptionId: string) => {
    setLocation(`/patient/prescription?id=${prescriptionId}`);
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
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Você ainda não possui prescrições publicadas.</p>
            <p className="text-sm text-muted-foreground">Entre em contato com seu nutricionista.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {prescriptions.map((prescription) => {
          const expirationStatus = getExpirationStatus(prescription);
          const isExpired = isPrescriptionExpired(prescription);
          const isDownloading = downloadingId === prescription.id;

          return (
            <Card key={prescription.id} className={`transition-all hover:shadow-md ${isExpired ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                      {prescription.title}
                    </CardTitle>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-1" />
                        Publicado em {prescription.publishedAt 
                          ? format(new Date(prescription.publishedAt), "dd/MM/yyyy", { locale: ptBR })
                          : 'Data não disponível'
                        }
                      </div>
                      
                      {expirationStatus && (
                        <Badge 
                          variant={expirationStatus.variant === 'destructive' ? 'destructive' : 'secondary'}
                          className="w-fit"
                        >
                          <expirationStatus.icon className="h-3 w-3 mr-1" />
                          {expirationStatus.type === 'expired' ? 'Expirada' : 'Expira em breve'}
                        </Badge>
                      )}
                    </div>

                    {expirationStatus && (
                      <Alert className={`mt-3 ${expirationStatus.variant === 'destructive' ? 'border-destructive bg-destructive/5' : 'border-yellow-500 bg-yellow-50'}`}>
                        <AlertDescription className="text-sm">
                          <strong>
                            {expirationStatus.type === 'expired' ? 'Prescrição Expirada: ' : 'Atenção: '}
                          </strong>
                          {expirationStatus.message}
                          {expirationStatus.type === 'expired' && (
                            <span className="block mt-1">
                              Entre em contato com seu nutricionista para renovar.
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleViewPrescription(prescription.id)}
                    className="flex-1 sm:flex-none"
                    disabled={isExpired}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                  
                  <Button
                    onClick={() => handleDownload(prescription)}
                    className="flex-1 sm:flex-none"
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };
  
  if (isMobile) {
    // Layout customizado para mobile
    return (
      <div className="min-h-screen bg-background">
        {/* Header customizado com gradiente */}
        <HeaderDNutri 
          onProfileClick={() => setIsProfileModalOpen(true)} 
          goalText={goalText} 
        />
        
        {/* Área de conteúdo com cantos superiores arredondados */}
        <main className="bg-white rounded-t-2xl -mt-2 min-h-screen pt-6 pb-20">
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Minhas Prescrições</h1>
              <FileText className="h-6 w-6 text-primary" />
            </div>
            {pageContent()}
          </div>
        </main>

        {/* Bottom navigation customizada */}
        <DNutriBottomNav 
          activeItem="prescriptions" 
          onItemClick={(item) => {
            if (item === "home") setLocation("/");
            else if (item === "prescriptions") setLocation("/patient/prescriptions");
            else if (item === "profile") {
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Minhas Prescrições"
        showBack={true}
        onBack={() => setLocation("/")}
      />
      <main className="max-w-4xl mx-auto p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Prescrições</h1>
          <p className="text-gray-600">Visualize e baixe suas prescrições nutricionais</p>
        </div>
        {pageContent()}
      </main>
    </div>
  );
}