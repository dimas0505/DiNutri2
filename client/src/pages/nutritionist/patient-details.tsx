import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Eye, FileText, Plus, Trash2, Users, XCircle, Link as LinkIcon, Copy, History } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import type { Patient, Prescription, AnamnesisRecord } from "@shared/schema";

export default function PatientDetails({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<string | null>(null);
  const [followUpLink, setFollowUpLink] = useState<string | null>(null);

  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", params.id],
  });

  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery<Prescription[]>({
    queryKey: ["/api/patients", params.id, "prescriptions"],
    enabled: !!patient,
  });

  const { data: anamnesisHistory, isLoading: historyLoading } = useQuery<AnamnesisRecord[]>({
    queryKey: ["/api/patients", params.id, "anamnesis-records"],
    enabled: !!patient,
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
      const response = await apiRequest("POST", `/api/prescriptions/${prescriptionId}/duplicate`, { title });
      return await response.json();
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

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const response = await apiRequest("DELETE", `/api/prescriptions/${prescriptionId}`);
      if (response.status === 204) {
        return null;
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Prescrição excluída",
        description: "A prescrição foi excluída com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "prescriptions"] });
      setPrescriptionToDelete(null);
    },
    onError: (error: any) => {
      console.error("Erro ao excluir prescrição:", error);
      const errorMessage = error.message.includes("403")
        ? "Não é possível excluir prescrições publicadas."
        : "Não foi possível excluir a prescrição. Tente novamente.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      setPrescriptionToDelete(null);
    },
  });

  const requestFollowUpMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/patients/${params.id}/request-follow-up`),
    onSuccess: async (res) => {
      const { followUpUrl } = await res.json();
      setFollowUpLink(followUpUrl);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao gerar link de anamnese de retorno.",
        variant: "destructive",
      });
    }
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

  const handleDeletePrescription = (prescriptionId: string) => {
    deletePrescriptionMutation.mutate(prescriptionId);
  };

  if (patientLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Carregando..." />
        <main className="max-w-7xl mx-auto p-4 lg:p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          title="Paciente não encontrado" 
          showBack={true} 
          onBack={() => setLocation("/patients")} 
        />
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
        subtitle={patient.email || undefined}
        showBack={true}
        onBack={() => setLocation("/patients")}
        drawerContent={<DefaultMobileDrawer />}
      />
      
      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="flex justify-end mb-4">
          <Button
            onClick={() => createPrescriptionMutation.mutate()}
            disabled={createPrescriptionMutation.isPending || !hasAccountLinked}
            title={!hasAccountLinked ? "Paciente precisa ter um login para criar prescrições" : "Nova Prescrição"}
            data-testid="button-new-prescription"
          >
            Nova Prescrição
          </Button>
        </div>

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
                <Button 
                  variant="secondary" 
                  className="mt-4 w-full text-sm"
                  onClick={() => setLocation(`/patients/${patient.id}/edit`)}
                >
                  Editar Dados
                </Button>
                <Button 
                  variant="outline" 
                  className="mt-2 w-full text-sm"
                  onClick={() => requestFollowUpMutation.mutate()}
                  disabled={requestFollowUpMutation.isPending}
                >
                  {requestFollowUpMutation.isPending ? "Gerando link..." : "Solicitar Anamnese de Retorno"}
                </Button>
              </CardContent>
            </Card>

            {/* Anamnese Section with Tabs */}
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current">Anamnese Atual</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>
              <TabsContent value="current">
                <Card>
                  <CardHeader>
                    <CardTitle>Anamnese Nutricional</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      {patient.goal && (
                        <div>
                          <span className="text-muted-foreground font-medium">Objetivo:</span>
                          <p className="mt-1">
                            {patient.goal === 'lose_weight' ? 'Perder peso' : 
                             patient.goal === 'maintain_weight' ? 'Manter peso' : 
                             patient.goal === 'gain_weight' ? 'Ganhar peso' : patient.goal}
                          </p>
                        </div>
                      )}
                      
                      {patient.activityLevel && (
                        <div>
                          <span className="text-muted-foreground font-medium">Nível de Atividade:</span>
                          <p className="mt-1">
                            {patient.activityLevel === '1' ? '1 - Sedentário' :
                             patient.activityLevel === '2' ? '2 - Levemente ativo' :
                             patient.activityLevel === '3' ? '3 - Moderadamente ativo' :
                             patient.activityLevel === '4' ? '4 - Muito ativo' :
                             patient.activityLevel === '5' ? '5 - Extremamente ativo' : patient.activityLevel}
                          </p>
                        </div>
                      )}

                      {patient.biotype && (
                        <div>
                          <span className="text-muted-foreground font-medium">Biotipo:</span>
                          <p className="mt-1">
                            {patient.biotype === 'gain_weight_easily' ? 'Ganho peso facilmente' :
                             patient.biotype === 'hard_to_gain' ? 'Dificuldade para ganhar peso' :
                             patient.biotype === 'gain_muscle_easily' ? 'Ganho músculo facilmente' : patient.biotype}
                          </p>
                        </div>
                      )}

                      {(patient.mealsPerDayCurrent || patient.mealsPerDayWilling) && (
                        <div>
                          <span className="text-muted-foreground font-medium">Refeições por dia:</span>
                          <p className="mt-1">
                            {patient.mealsPerDayCurrent && `Atual: ${patient.mealsPerDayCurrent}`}
                            {patient.mealsPerDayCurrent && patient.mealsPerDayWilling && ' | '}
                            {patient.mealsPerDayWilling && `Disposto: ${patient.mealsPerDayWilling}`}
                          </p>
                        </div>
                      )}

                      {patient.alcoholConsumption && (
                        <div>
                          <span className="text-muted-foreground font-medium">Consumo de Álcool:</span>
                          <p className="mt-1">
                            {patient.alcoholConsumption === 'no' ? 'Não bebe' :
                             patient.alcoholConsumption === 'moderate' ? 'Moderadamente' :
                             patient.alcoholConsumption === 'yes' ? 'Sim, frequentemente' : patient.alcoholConsumption}
                          </p>
                        </div>
                      )}

                      {patient.canEatMorningSolids !== undefined && (
                        <div>
                          <span className="text-muted-foreground font-medium">Come sólidos pela manhã:</span>
                          <p className="mt-1">{patient.canEatMorningSolids ? 'Sim' : 'Não'}</p>
                        </div>
                      )}

                      {patient.likedHealthyFoods && Array.isArray(patient.likedHealthyFoods) && patient.likedHealthyFoods.length > 0 && (
                        <div>
                          <span className="text-muted-foreground font-medium">Alimentos saudáveis que gosta:</span>
                          <p className="mt-1">{patient.likedHealthyFoods.join(', ')}</p>
                        </div>
                      )}

                      {patient.dislikedFoods && Array.isArray(patient.dislikedFoods) && patient.dislikedFoods.length > 0 && (
                        <div>
                          <span className="text-muted-foreground font-medium">Alimentos que não gosta:</span>
                          <p className="mt-1">{patient.dislikedFoods.join(', ')}</p>
                        </div>
                      )}

                      {patient.hasIntolerance && patient.intolerances && Array.isArray(patient.intolerances) && patient.intolerances.length > 0 && (
                        <div>
                          <span className="text-muted-foreground font-medium">Intolerâncias:</span>
                          <p className="mt-1">{patient.intolerances.join(', ')}</p>
                        </div>
                      )}

                      {patient.diseases && (
                        <div>
                          <span className="text-muted-foreground font-medium">Doenças/Condições:</span>
                          <p className="mt-1">{patient.diseases}</p>
                        </div>
                      )}

                      {patient.medications && (
                        <div>
                          <span className="text-muted-foreground font-medium">Medicamentos:</span>
                          <p className="mt-1">{patient.medications}</p>
                        </div>
                      )}

                      {patient.supplements && (
                        <div>
                          <span className="text-muted-foreground font-medium">Suplementos:</span>
                          <p className="mt-1">{patient.supplements}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Anamneses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? (
                      <p>Carregando histórico...</p>
                    ) : !anamnesisHistory || anamnesisHistory.length === 0 ? (
                      <p>Nenhum registro encontrado.</p>
                    ) : (
                      <div className="space-y-4">
                        {anamnesisHistory.map(record => (
                          <div key={record.id} className="p-3 border rounded-md">
                            <p className="font-medium">Data: {new Date(record.createdAt!).toLocaleDateString('pt-BR')}</p>
                            <p className="text-sm">Peso: {record.weightKg || 'N/A'} kg</p>
                            {record.goal && (
                              <p className="text-sm">Objetivo: {
                                record.goal === 'lose_weight' ? 'Perder peso' : 
                                record.goal === 'maintain_weight' ? 'Manter peso' : 
                                record.goal === 'gain_weight' ? 'Ganhar peso' : record.goal
                              }</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

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
                          {prescription.createdAt && `Criado em ${formatDate(prescription.createdAt.toString())}`}
                          {prescription.publishedAt && ` • Publicado em ${formatDate(prescription.publishedAt.toString())}`}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/prescriptions/${prescription.id}/edit`)}
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80"
                                data-testid={`button-delete-prescription-${prescription.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza de que deseja excluir a prescrição "{prescription.title}"?
                                  <div className="mt-2 text-red-600">
                                    Esta ação não pode ser desfeita.
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePrescription(prescription.id)}
                                  disabled={deletePrescriptionMutation.isPending}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletePrescriptionMutation.isPending ? "Excluindo..." : "Excluir"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Dialog for showing follow-up link */}
      <Dialog open={!!followUpLink} onOpenChange={() => setFollowUpLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de Anamnese de Retorno</DialogTitle>
            <DialogDescription>Envie este link para o paciente.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input value={followUpLink || ""} readOnly />
            <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(followUpLink!)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}