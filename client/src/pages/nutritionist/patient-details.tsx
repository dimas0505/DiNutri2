import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, FileText, Eye, Edit, Copy } from "lucide-react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Patient, Prescription } from "@shared/schema";

interface PatientDetailsPageProps {
  params: { id: string };
}

export default function PatientDetailsPage({ params }: PatientDetailsPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", params.id],
  });

  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery<Prescription[]>({
    queryKey: ["/api/patients", params.id, "prescriptions"],
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: async () => {
      const newPrescription = {
        patientId: params.id,
        title: `Prescrição ${new Date().toLocaleDateString('pt-BR')}`,
        meals: [],
        generalNotes: "",
      };
      return await apiRequest("POST", "/api/prescriptions", newPrescription);
    },
    onSuccess: (prescription) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "prescriptions"] });
      setLocation(`/prescriptions/${prescription.id}/edit`);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar prescrição.",
        variant: "destructive",
      });
    },
  });

  const duplicatePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const title = `Cópia - ${new Date().toLocaleDateString('pt-BR')}`;
      return await apiRequest("POST", `/api/prescriptions/${prescriptionId}/duplicate`, { title });
    },
    onSuccess: (prescription) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "prescriptions"] });
      setLocation(`/prescriptions/${prescription.id}/edit`);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao duplicar prescrição.",
        variant: "destructive",
      });
    },
  });

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (patientLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Carregando..." />
        <main className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Paciente não encontrado" />
        <main className="max-w-7xl mx-auto p-4 lg:p-6">
          <p className="text-center text-muted-foreground">Paciente não encontrado.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        title={patient.name}
        subtitle={patient.email}
        leftElement={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/patients")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
        rightElement={
          <Button
            onClick={() => createPrescriptionMutation.mutate()}
            disabled={createPrescriptionMutation.isPending}
            data-testid="button-new-prescription"
          >
            Nova Prescrição
          </Button>
        }
      />

      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Paciente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {patient.birthDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Idade:</span>
                      <span data-testid="text-patient-age">{calculateAge(patient.birthDate)} anos</span>
                    </div>
                  )}
                  {patient.sex && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sexo:</span>
                      <span data-testid="text-patient-sex">{patient.sex === 'F' ? 'Feminino' : patient.sex === 'M' ? 'Masculino' : 'Outro'}</span>
                    </div>
                  )}
                  {patient.heightCm && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Altura:</span>
                      <span data-testid="text-patient-height">{patient.heightCm} cm</span>
                    </div>
                  )}
                  {patient.weightKg && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Peso:</span>
                      <span data-testid="text-patient-weight">{patient.weightKg} kg</span>
                    </div>
                  )}
                </div>
                {patient.notes && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground" data-testid="text-patient-notes">{patient.notes}</p>
                  </div>
                )}
                <Button variant="secondary" className="mt-4 w-full text-sm">
                  Editar Dados
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Prescriptions History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Prescrições</CardTitle>
              </CardHeader>
              <CardContent>
                {prescriptionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Carregando prescrições...</p>
                  </div>
                ) : prescriptions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Nenhuma prescrição criada ainda.</p>
                    <Button 
                      onClick={() => createPrescriptionMutation.mutate()}
                      disabled={createPrescriptionMutation.isPending}
                      data-testid="button-create-first-prescription"
                    >
                      Criar Primeira Prescrição
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((prescription) => (
                      <div key={prescription.id} className="border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium" data-testid={`text-prescription-title-${prescription.id}`}>
                            {prescription.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant={prescription.status === 'published' ? 'default' : 'secondary'}>
                              {prescription.status === 'published' ? 'Publicado' : 'Rascunho'}
                            </Badge>
                            <div className="flex space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Visualizar"
                                data-testid={`button-view-prescription-${prescription.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setLocation(`/prescriptions/${prescription.id}/edit`)}
                                title="Editar"
                                data-testid={`button-edit-prescription-${prescription.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => duplicatePrescriptionMutation.mutate(prescription.id)}
                                disabled={duplicatePrescriptionMutation.isPending}
                                title="Duplicar"
                                data-testid={`button-duplicate-prescription-${prescription.id}`}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {prescription.meals.length} refeições configuradas • 
                          {prescription.status === 'published' && prescription.publishedAt
                            ? ` Publicado em ${formatDate(prescription.publishedAt.toString())}`
                            : ` Última edição em ${formatDate(prescription.updatedAt?.toString() || '')}`
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
