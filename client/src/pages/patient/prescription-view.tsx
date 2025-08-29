import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Printer } from "lucide-react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MealViewer from "@/components/prescription/meal-viewer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Prescription, Patient, User } from "@shared/schema";

export default function PatientPrescriptionView() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect to login if not authenticated
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

  // For now, we'll assume patient ID is the same as user ID
  // In a real app, you'd have a proper patient lookup system
  const { data: prescription, isLoading: prescriptionLoading, error } = useQuery<Prescription>({
    queryKey: ["/api/patients", user?.id, "latest-prescription"],
    enabled: !!user?.id,
    retry: false,
  });

  // Handle unauthorized errors
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading || prescriptionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Carregando..." />
        <main className="max-w-4xl mx-auto p-4 lg:p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando prescrição...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Minha Prescrição" />
        <main className="max-w-4xl mx-auto p-4 lg:p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Você ainda não possui uma prescrição publicada.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com seu nutricionista para receber sua prescrição.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Minha Prescrição"
        rightElement={
          <Button
            onClick={() => setLocation(`/prescriptions/${prescription.id}/print`)}
            className="flex items-center space-x-2"
            data-testid="button-print-prescription"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir</span>
          </Button>
        }
      />

      <main className="max-w-4xl mx-auto p-4 lg:p-6">
        {/* Prescription Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2" data-testid="text-prescription-title">
                  {prescription.title}
                </h2>
                <p className="text-muted-foreground">
                  Publicado em {prescription.publishedAt && formatDate(prescription.publishedAt)}
                </p>
              </div>
            </div>

            {prescription.generalNotes && (
              <div className="bg-muted/30 p-4 rounded-md">
                <p className="text-sm" data-testid="text-general-notes">
                  {prescription.generalNotes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meals Display */}
        <div className="space-y-6">
          {prescription.meals && prescription.meals.length > 0 ? (
            prescription.meals.map((meal) => (
              <MealViewer key={meal.id} meal={meal} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  Esta prescrição não possui refeições configuradas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
