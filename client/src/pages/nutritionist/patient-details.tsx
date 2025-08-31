import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Eye, FileText, Plus, Trash2, Users, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Patient, Prescription } from "@shared/schema";

export default function PatientDetails({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", params.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/patients/${params.id}`);
      return await response.json();
    },
  });

  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery<Prescription[]>({
    queryKey: ["/api/patients", params.id, "prescriptions"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/patients/${params.id}/prescriptions`);
      return await response.json();
    },
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: async () => {
      const newPrescription = {
        patientId: params.id,
        title: `Prescrição ${new Date().toLocaleDateString('pt-BR')}`,
        meals: [],
        generalNotes: "",
      };
      const response = await apiRequest("POST", "/api/prescriptions", newPrescription);
      return await response.json();
    },
    onSuccess: (prescription) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "prescriptions"] });
      setLocation(`/prescriptions/${prescription.id}`);
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
      const response = await apiRequest("POST", `/api/prescriptions/${prescriptionId}/duplicate`, { title });
      return await response.json();
    },
    onSuccess: (prescription) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "prescriptions"] });
      setLocation(`/prescriptions/${prescription.id}`);
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
  
  const hasAccountLinked = !!patient.userId;

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
            disabled={createPrescriptionMutation.isPending || !hasAccountLinked}
            title={!hasAccountLinked ? "Paciente precisa ter um login para criar prescrições" : "Nova Prescrição"}
            data-testid="button-new-prescription"
          >
            Nova Prescrição
          </Button>
        }
      />

      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info */}
          <div className="lg:col-span-1 space-y-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Acesso do Paciente</CardTitle>
              </CardHeader>
              <CardContent>
                {hasAccountLinked ? (
                  <div className="flex items-center gap-3 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm">Paciente tem acesso ao sistema</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-amber-600">
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm">Paciente ainda não possui acesso</span>
                  </div>
                )}
                {!hasAccountLinked && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Para criar prescrições, o paciente precisa primeiro fazer o cadastro no sistema.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Prescriptions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Prescrições</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => createPrescriptionMutation.mutate()}
                    disabled={createPrescriptionMutation.isPending || !hasAccountLinked}
                    title={!hasAccountLinked ? "Paciente precisa ter um login" : "Nova prescrição"}
                    data-testid="button-new-prescription-card"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {prescriptionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground text-sm">Carregando prescrições...</p>
                  </div>
                ) : prescriptions && prescriptions.length > 0 ? (
                  <div className="space-y-4">
                    {prescriptions.map((prescription) => (
                      <div key={prescription.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium" data-testid={`text-prescription-title-${prescription.id}`}>
                            {prescription.title}
                          </h3>
                          <Badge 
                            variant={prescription.status === 'published' ? 'default' : 'secondary'}
                            data-testid={`badge-prescription-status-${prescription.id}`}
                          >
                            {prescription.status === 'published' ? 'Publicado' : 'Rascunho'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Criado em {formatDate(prescription.createdAt)}
                          {prescription.publishedAt && ` • Publicado em ${formatDate(prescription.publishedAt)}`}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/prescriptions/${prescription.id}`)}
                            data-testid={`button-edit-prescription-${prescription.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {prescription.status === 'published' ? 'Visualizar' : 'Editar'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicatePrescriptionMutation.mutate(prescription.id)}
                            disabled={duplicatePrescriptionMutation.isPending}
                            data-testid={`button-duplicate-prescription-${prescription.id}`}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Duplicar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Nenhuma prescrição criada ainda.</p>
                    {hasAccountLinked ? (
                      <Button
                        onClick={() => createPrescriptionMutation.mutate()}
                        disabled={createPrescriptionMutation.isPending}
                        data-testid="button-create-first-prescription"
                      >
                        Criar Primeira Prescrição
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        O paciente precisa ter um login para criar prescrições.
                      </p>
                    )}
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