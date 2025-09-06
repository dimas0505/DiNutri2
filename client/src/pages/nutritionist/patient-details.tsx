import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Eye, FileText, Plus, Trash2, Users, XCircle, Link as LinkIcon, Copy, History, User, Calendar, Ruler, Weight, Target, Activity, Heart, Stethoscope, Pill, Camera, Image, Smile } from "lucide-react";
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
import type { Patient, Prescription, AnamnesisRecord, FoodDiaryEntryWithPrescription, MealData, MoodType } from "@shared/schema";

export default function PatientDetails({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<string | null>(null);
  const [followUpLink, setFollowUpLink] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  const { data: foodDiaryEntries, isLoading: foodDiaryLoading } = useQuery<FoodDiaryEntryWithPrescription[]>({
    queryKey: ["/api/patients", params.id, "food-diary", "entries"],
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

  const deletePatientMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/patients/${params.id}`),
    onSuccess: () => {
      toast({
        title: "Paciente excluído com sucesso!",
        variant: "default",
      });
      setLocation('/patients');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir paciente",
        description: "Ocorreu um erro ao excluir o paciente. Tente novamente.",
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

  const getMoodEmoji = (mood: MoodType | null | undefined) => {
    if (!mood) return null;
    switch (mood) {
      case 'very_sad': return '😢';
      case 'sad': return '😟';
      case 'neutral': return '😐';
      case 'happy': return '😊';
      case 'very_happy': return '😄';
      default: return null;
    }
  };

  const getMoodLabel = (mood: MoodType | null | undefined) => {
    if (!mood) return null;
    switch (mood) {
      case 'very_sad': return 'Muito triste';
      case 'sad': return 'Triste';
      case 'neutral': return 'Neutro';
      case 'happy': return 'Feliz';
      case 'very_happy': return 'Muito feliz';
      default: return null;
    }
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
        {/* Enhanced Header Section */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Detalhes do Paciente</h1>
              <p className="text-blue-100 opacity-90">Visualize e gerencie as informações completas do paciente</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={deletePatientMutation.isPending}
                className="font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Excluir Paciente
              </Button>
              <Button
                onClick={() => createPrescriptionMutation.mutate()}
                disabled={createPrescriptionMutation.isPending || !hasAccountLinked}
                title={!hasAccountLinked ? "Paciente precisa ter um login para criar prescrições" : "Nova Prescrição"}
                data-testid="button-new-prescription"
                className="bg-white/20 hover:bg-white/30 border-white/30 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
              >
                <Plus className="h-5 w-5 mr-2" />
                {createPrescriptionMutation.isPending ? "Criando..." : "Nova Prescrição"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Informações do Paciente</CardTitle>
                    <p className="text-blue-100 text-sm opacity-90">{patient.name}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {patient.birthDate && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/20 dark:to-blue-900/20 border border-slate-200/50 dark:border-slate-700/50">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Idade</span>
                        <p className="font-semibold text-gray-900 dark:text-white" data-testid="text-patient-age">{calculateAge(patient.birthDate)} anos</p>
                      </div>
                    </div>
                  )}
                  {patient.sex && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Sexo</span>
                        <p className="font-semibold text-gray-900 dark:text-white" data-testid="text-patient-sex">{patient.sex === 'F' ? 'Feminino' : patient.sex === 'M' ? 'Masculino' : 'Outro'}</p>
                      </div>
                    </div>
                  )}
                  {patient.heightCm && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200/50 dark:border-indigo-700/50">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                        <Ruler className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Altura</span>
                        <p className="font-semibold text-gray-900 dark:text-white" data-testid="text-patient-height">{patient.heightCm} cm</p>
                      </div>
                    </div>
                  )}
                  {patient.weightKg && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-900/20 dark:to-slate-900/20 border border-blue-200/50 dark:border-blue-700/50">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                        <Weight className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Peso</span>
                        <p className="font-semibold text-gray-900 dark:text-white" data-testid="text-patient-weight">{patient.weightKg} kg</p>
                      </div>
                    </div>
                  )}
                </div>
                {patient.notes && (
                  <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border border-gray-200/50 dark:border-gray-700/50">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Observações</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300" data-testid="text-patient-notes">{patient.notes}</p>
                  </div>
                )}
                <div className="mt-6 space-y-3">
                  <Button 
                    variant="default" 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                    onClick={() => setLocation(`/patients/${patient.id}/edit`)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Editar Dados
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium py-2.5 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
                    onClick={() => requestFollowUpMutation.mutate()}
                    disabled={requestFollowUpMutation.isPending}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {requestFollowUpMutation.isPending ? "Gerando link..." : "Solicitar Anamnese de Retorno"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Anamnese Section with Tabs */}
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <TabsTrigger value="current" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium transition-all">Anamnese Atual</TabsTrigger>
                <TabsTrigger value="history" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium transition-all">Histórico</TabsTrigger>
              </TabsList>
              <TabsContent value="current">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white pb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Stethoscope className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl font-bold">Anamnese Nutricional</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {patient.goal && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/20 dark:to-blue-900/20 border border-slate-200/50 dark:border-slate-700/50">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <Target className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Objetivo</span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {patient.goal === 'lose_weight' ? 'Perder peso' : 
                               patient.goal === 'maintain_weight' ? 'Manter peso' : 
                               patient.goal === 'gain_weight' ? 'Ganhar peso' : patient.goal}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {patient.activityLevel && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50">
                          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Nível de Atividade</span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {patient.activityLevel === '1' ? '1 - Sedentário' :
                               patient.activityLevel === '2' ? '2 - Levemente ativo' :
                               patient.activityLevel === '3' ? '3 - Moderadamente ativo' :
                               patient.activityLevel === '4' ? '4 - Muito ativo' :
                               patient.activityLevel === '5' ? '5 - Extremamente ativo' : patient.activityLevel}
                            </p>
                          </div>
                        </div>
                      )}

                      {patient.biotype && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200/50 dark:border-indigo-700/50">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                            <User className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Biotipo</span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {patient.biotype === 'gain_weight_easily' ? 'Ganho peso facilmente' :
                               patient.biotype === 'hard_to_gain' ? 'Dificuldade para ganhar peso' :
                               patient.biotype === 'gain_muscle_easily' ? 'Ganho músculo facilmente' : patient.biotype}
                            </p>
                          </div>
                        </div>
                      )}

                      {(patient.mealsPerDayCurrent || patient.mealsPerDayWilling) && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-900/20 dark:to-slate-900/20 border border-blue-200/50 dark:border-blue-700/50">
                          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Refeições por dia</span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {patient.mealsPerDayCurrent && `Atual: ${patient.mealsPerDayCurrent}`}
                              {patient.mealsPerDayCurrent && patient.mealsPerDayWilling && ' | '}
                              {patient.mealsPerDayWilling && `Disposto: ${patient.mealsPerDayWilling}`}
                            </p>
                          </div>
                        </div>
                      )}

                      {patient.alcoholConsumption && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-900/20 dark:to-indigo-900/20 border border-slate-200/50 dark:border-slate-700/50">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <Heart className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Consumo de Álcool</span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {patient.alcoholConsumption === 'no' ? 'Não bebe' :
                               patient.alcoholConsumption === 'moderate' ? 'Moderadamente' :
                               patient.alcoholConsumption === 'yes' ? 'Sim, frequentemente' : patient.alcoholConsumption}
                            </p>
                          </div>
                        </div>
                      )}

                      {patient.canEatMorningSolids !== undefined && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-900/20 dark:to-slate-900/20 border border-indigo-200/50 dark:border-indigo-700/50">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Come sólidos pela manhã</span>
                            <p className="font-semibold text-gray-900 dark:text-white">{patient.canEatMorningSolids ? 'Sim' : 'Não'}</p>
                          </div>
                        </div>
                      )}

                      {patient.likedHealthyFoods && Array.isArray(patient.likedHealthyFoods) && patient.likedHealthyFoods.length > 0 && (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Heart className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Alimentos saudáveis que gosta</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {patient.likedHealthyFoods.map((food, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 rounded-full">
                                {food}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {patient.dislikedFoods && Array.isArray(patient.dislikedFoods) && patient.dislikedFoods.length > 0 && (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200/50 dark:border-red-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-300" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Alimentos que não gosta</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {patient.dislikedFoods.map((food, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-full">
                                {food}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {patient.hasIntolerance && patient.intolerances && Array.isArray(patient.intolerances) && patient.intolerances.length > 0 && (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200/50 dark:border-orange-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Intolerâncias</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {patient.intolerances.map((intolerance, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200 rounded-full">
                                {intolerance}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {patient.diseases && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/20 dark:to-blue-900/20 border border-slate-200/50 dark:border-slate-700/50">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <Stethoscope className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Doenças/Condições</span>
                            <p className="font-semibold text-gray-900 dark:text-white">{patient.diseases}</p>
                          </div>
                        </div>
                      )}

                      {patient.medications && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50">
                          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                            <Pill className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Medicamentos</span>
                            <p className="font-semibold text-gray-900 dark:text-white">{patient.medications}</p>
                          </div>
                        </div>
                      )}

                      {patient.supplements && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200/50 dark:border-indigo-700/50">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                            <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Suplementos</span>
                            <p className="font-semibold text-gray-900 dark:text-white">{patient.supplements}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="history">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/30 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-gray-600 to-slate-600 text-white pb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <History className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl font-bold">Histórico de Anamneses</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {historyLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                        <p className="text-gray-600 dark:text-gray-300">Carregando histórico...</p>
                      </div>
                    ) : !anamnesisHistory || anamnesisHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-300">Nenhum registro encontrado.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {anamnesisHistory.map(record => (
                          <div key={record.id} className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                              <p className="font-semibold text-gray-900 dark:text-white">Data: {new Date(record.createdAt!).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Weight className="h-3 w-3 text-orange-600 dark:text-orange-300" />
                                <span className="text-gray-600 dark:text-gray-300">Peso: <span className="font-medium text-gray-900 dark:text-white">{record.weightKg || 'N/A'} kg</span></span>
                              </div>
                              {record.goal && (
                                <div className="flex items-center gap-2">
                                  <Target className="h-3 w-3 text-emerald-600 dark:text-emerald-300" />
                                  <span className="text-gray-600 dark:text-gray-300">Objetivo: <span className="font-medium text-gray-900 dark:text-white">{
                                    record.goal === 'lose_weight' ? 'Perder peso' : 
                                    record.goal === 'maintain_weight' ? 'Manter peso' : 
                                    record.goal === 'gain_weight' ? 'Ganhar peso' : record.goal
                                  }</span></span>
                                </div>
                              )}
                              {record.protocolAdherence && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-purple-600 dark:text-purple-300" />
                                  <span className="text-gray-600 dark:text-gray-300">Adesão: <span className="font-medium text-gray-900 dark:text-white">{
                                    record.protocolAdherence === 'total' ? 'Total' :
                                    record.protocolAdherence === 'partial' ? 'Parcial' :
                                    record.protocolAdherence === 'low' ? 'Baixa' : record.protocolAdherence
                                  }</span></span>
                                </div>
                              )}
                            </div>
                            {record.nextProtocolRequests && (
                              <div className="mt-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-md">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Solicitações para próximo plano:</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{record.nextProtocolRequests}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-green-50/30 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Users className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-bold">Acesso do Paciente</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {hasAccountLinked ? (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-700/50">
                    <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-200">Paciente tem acesso ao sistema</p>
                      <p className="text-sm text-green-600 dark:text-green-300">Prescrições podem ser criadas</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/50 dark:border-amber-700/50">
                      <div className="p-3 bg-amber-100 dark:bg-amber-800 rounded-full">
                        <XCircle className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-200">Paciente ainda não possui acesso</p>
                        <p className="text-sm text-amber-600 dark:text-amber-300">Cadastro pendente no sistema</p>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-300 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Para criar prescrições, o paciente precisa primeiro fazer o cadastro no sistema usando o link de cadastro fornecido.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Prescriptions */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <FileText className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl font-bold">Prescrições Nutricionais</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {prescriptionsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Carregando prescrições...</p>
                  </div>
                ) : prescriptions && prescriptions.length > 0 ? (
                  <div className="space-y-4">
                    {prescriptions.map((prescription) => (
                      <div key={prescription.id} className="p-4 sm:p-5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-md transition-all duration-200 transform hover:scale-[1.01] overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg flex-shrink-0">
                              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate" data-testid={`text-prescription-title-${prescription.id}`}>
                                {prescription.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                Criada em {new Date(prescription.createdAt!).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={prescription.status === 'published' ? 'default' : 'secondary'}
                            className={`${prescription.status === 'published' 
                              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-800 dark:text-green-100 dark:border-green-700' 
                              : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
                            } px-3 py-1 font-medium flex-shrink-0 self-start`}
                            data-testid={`badge-prescription-status-${prescription.id}`}
                          >
                            {prescription.status === 'published' ? 'Publicado' : 'Rascunho'}
                          </Badge>
                        </div>
                        {prescription.generalNotes && (
                          <div className="mt-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-md">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{prescription.generalNotes}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/prescriptions/${prescription.id}/edit`)}
                            data-testid={`button-edit-prescription-${prescription.id}`}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-blue-200 dark:border-blue-700 transition-all duration-200 rounded-lg"
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
                            className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 dark:text-purple-200 dark:border-purple-700 transition-all duration-200 rounded-lg"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {duplicatePrescriptionMutation.isPending ? 'Duplicando...' : 'Duplicar'}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 dark:border-red-700/50 transition-all duration-200 rounded-lg"
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
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhuma prescrição criada</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                      Comece criando a primeira prescrição nutricional para este paciente.
                    </p>
                    {hasAccountLinked ? (
                      <Button
                        onClick={() => createPrescriptionMutation.mutate()}
                        disabled={createPrescriptionMutation.isPending}
                        data-testid="button-create-first-prescription"
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        {createPrescriptionMutation.isPending ? "Criando..." : "Criar Primeira Prescrição"}
                      </Button>
                    ) : (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200/50 dark:border-amber-700/50 max-w-md mx-auto">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                          <XCircle className="h-5 w-5" />
                          <p className="font-medium">O paciente precisa ter um login para criar prescrições.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Food Diary Section */}
        <div className="mt-8">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-600 to-amber-600 text-white pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Camera className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold">Diário Alimentar</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {foodDiaryLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300 font-medium">Carregando diário alimentar...</p>
                </div>
              ) : foodDiaryEntries && foodDiaryEntries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {foodDiaryEntries.map((entry) => {
                    // Find the meal name from the prescription meals
                    const mealName = entry.prescriptionMeals?.find((meal: MealData) => meal.id === entry.mealId)?.name || `Refeição ${entry.mealId}`;
                    
                    return (
                      <div key={entry.id} className="bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-900/10 rounded-lg border border-orange-200/50 dark:border-orange-700/50 overflow-hidden shadow-md hover:shadow-lg transition-all duration-200">
                        <div className="aspect-square relative">
                          <img 
                            src={entry.imageUrl} 
                            alt="Foto da refeição" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW0gbsOjbyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg==';
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                            {formatDate(entry.date)}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Image className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                            <span className="font-semibold text-gray-900 dark:text-white">{mealName}</span>
                          </div>
                          {entry.prescriptionTitle && (
                            <div className="mb-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Prescrição: {entry.prescriptionTitle}
                              </span>
                            </div>
                          )}
                          
                          {/* Mood Information */}
                          {(entry.moodBefore || entry.moodAfter) && (
                            <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-blue-700/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Smile className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Humor</span>
                              </div>
                              <div className="space-y-1 text-sm">
                                {entry.moodBefore && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Antes:</span>
                                    <span className="text-lg">{getMoodEmoji(entry.moodBefore)}</span>
                                    <span className="text-gray-700 dark:text-gray-300">{getMoodLabel(entry.moodBefore)}</span>
                                  </div>
                                )}
                                {entry.moodAfter && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Depois:</span>
                                    <span className="text-lg">{getMoodEmoji(entry.moodAfter)}</span>
                                    <span className="text-gray-700 dark:text-gray-300">{getMoodLabel(entry.moodAfter)}</span>
                                  </div>
                                )}
                              </div>
                              {entry.moodNotes && (
                                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Observações do humor:</span> {entry.moodNotes}
                                </div>
                              )}
                            </div>
                          )}

                          {entry.notes && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Observações da refeição:</span> {entry.notes}
                              </p>
                            </div>
                          )}
                          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            Enviado em {new Date(entry.createdAt!).toLocaleDateString('pt-BR')} às {new Date(entry.createdAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Camera className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhuma foto enviada</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                    O paciente ainda não enviou fotos das refeições. As imagens aparecerão aqui quando forem enviadas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
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

      {/* Delete Patient Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              paciente e todos os seus dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePatientMutation.mutate()}
              disabled={deletePatientMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePatientMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}