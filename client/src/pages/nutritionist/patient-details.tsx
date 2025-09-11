import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Eye, FileText, Plus, Users, XCircle, Link as LinkIcon, Copy, History, User, Calendar, Ruler, Weight, Target, Activity, Heart, Stethoscope, Pill, Camera, Image, Smile, Trash2, FileDown, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { AnamnesisNutritionistDataForm } from "@/components/nutritionist/anamnesis-nutritionist-data-form";
import { generatePrescriptionPDF } from "@/utils/pdf-generator";
import type { Patient, Prescription, AnamnesisRecord, FoodDiaryEntryWithPrescription, MealData, MoodType, Subscription } from "@shared/schema";

export default function PatientDetails({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<string | null>(null);
  const [followUpLink, setFollowUpLink] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isCreateSubscriptionDialogOpen, setIsCreateSubscriptionDialogOpen] = useState(false);
  const [isEditSubscriptionDialogOpen, setIsEditSubscriptionDialogOpen] = useState(false);
  const [newSubscriptionPlanType, setNewSubscriptionPlanType] = useState<Subscription['planType']>('monthly');
  const [newSubscriptionStatus, setNewSubscriptionStatus] = useState<Subscription['status']>('active');
  const [newSubscriptionExpiresAt, setNewSubscriptionExpiresAt] = useState<string>('');
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);

  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", params.id],
  });

  const { data: currentSubscription } = useQuery<Subscription>({
    queryKey: ["/api/patients", params.id, "subscription"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/patients/${params.id}/subscription`);
      return await response.json();
    },
    enabled: !!patient,
  });

  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery<Prescription[]>({
    queryKey: ["/api/patients", params.id, "prescriptions"],
    enabled: !!patient,
  });

  const { data: anamnesisHistory, isLoading: historyLoading } = useQuery<AnamnesisRecord[]>({
    queryKey: ["/api/patients", params.id, "anamnesis-records"],
    enabled: !!patient,
  });

  // Function to create initial anamnesis record from current patient data
  const createInitialAnamnesisRecord = useMutation({
    mutationFn: async () => {
      if (!patient) throw new Error("Patient not found");
      
      const initialRecord = {
        patientId: patient.id,
        weightKg: patient.weightKg,
        notes: patient.notes,
        goal: patient.goal,
        activityLevel: patient.activityLevel,
        likedHealthyFoods: patient.likedHealthyFoods,
        dislikedFoods: patient.dislikedFoods,
        hasIntolerance: patient.hasIntolerance,
        intolerances: patient.intolerances,
        canEatMorningSolids: patient.canEatMorningSolids,
        mealsPerDayCurrent: patient.mealsPerDayCurrent,
        mealsPerDayWilling: patient.mealsPerDayWilling,
        alcoholConsumption: patient.alcoholConsumption,
        supplements: patient.supplements,
        diseases: patient.diseases,
        medications: patient.medications,
        biotype: patient.biotype,
      };

      const response = await apiRequest("POST", `/api/patients/${patient.id}/anamnesis-records`, initialRecord);
      return await response.json();
    },
    onSuccess: () => {
      // Refresh anamnesis records after creating initial record
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "anamnesis-records"] });
    },
    onError: (error) => {
      console.error("Error creating initial anamnesis record:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar registro inicial de anamnese.",
        variant: "destructive",
      });
    },
  });

  // Get the most recent (current) anamnesis record or create one if none exists
  const currentAnamnesisRecord = anamnesisHistory && anamnesisHistory.length > 0 
    ? anamnesisHistory[anamnesisHistory.length - 1] // Most recent record
    : null;

  const { data: foodDiaryEntries, isLoading: foodDiaryLoading } = useQuery<FoodDiaryEntryWithPrescription[]>({
    queryKey: ["/api/patients", params.id, "food-diary", "entries"],
    enabled: !!patient,
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: () => {
      // Define uma data de expiração padrão para 90 dias no futuro
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      return fetch(`/api/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: params.id,
          title: 'Nova Prescrição', // Adiciona um título padrão
          expiresAt: expiresAt.toISOString(), // Adiciona a data de expiração padrão
        }),
      }).then((res) => {
        if (!res.ok) {
          // Em caso de erro, jogue o objeto de resposta completo
          // para que possa ser capturado pelo `onError`.
          throw res;
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Prescrição criada com sucesso!',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "prescriptions"] });
      setLocation(`/prescriptions/${data.id}/edit`);
    },
    onError: async (error: unknown) => {
      let errorDetails = 'Não foi possível obter os detalhes do erro.';
      
      // Verifica se o erro é um objeto de resposta HTTP
      if (error instanceof Response) {
        try {
          // Tenta ler o corpo da resposta como JSON
          const errorJson = await error.json();
          // Formata o JSON para ser facilmente legível no console
          errorDetails = JSON.stringify(errorJson, null, 2);
        } catch (e) {
          errorDetails = 'A resposta do servidor não continha um JSON válido.';
        }
      }

      // Exibe o erro detalhado no console do navegador
      console.error("DETALHES DO ERRO DE VALIDAÇÃO:", errorDetails);

      toast({
        title: 'Erro ao criar prescrição',
        description: 'O servidor rejeitou os dados. Verifique o console para detalhes técnicos.',
        variant: 'destructive',
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

  const deletePhotoMutation = useMutation({
    mutationFn: (entryId: string) =>
      fetch(`/api/food-diary/entries/${entryId}/photo`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast({ title: 'Entrada do diário excluída com sucesso!', variant: 'default' });
      // Invalidate the query to reload the updated data
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "food-diary", "entries"] });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir a entrada do diário', variant: 'destructive' });
    },
    onSettled: () => {
      setEntryToDelete(null); // Close the dialog
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ planType, status, expiresAt }: { 
      planType: Subscription['planType'], 
      status: Subscription['status'],
      expiresAt?: string
    }) => {
      const response = await apiRequest("POST", `/api/nutritionist/patients/${params.id}/subscription`, {
        planType,
        status,
        expiresAt
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Assinatura criada com sucesso!",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "subscription"] });
      setIsCreateSubscriptionDialogOpen(false);
      setNewSubscriptionExpiresAt('');
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar assinatura.",
        variant: "destructive",
      });
    },
  });

  const editSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionId, planType, status, expiresAt }: { 
      subscriptionId: string,
      planType: Subscription['planType'], 
      status: Subscription['status'],
      expiresAt?: string
    }) => {
      const response = await apiRequest("PATCH", `/api/subscriptions/${subscriptionId}/manage`, {
        planType,
        status,
        expiresAt
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Assinatura editada com sucesso!",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "subscription"] });
      setIsEditSubscriptionDialogOpen(false);
      setNewSubscriptionExpiresAt('');
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao editar assinatura.",
        variant: "destructive",
      });
    },
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await apiRequest("DELETE", `/api/subscriptions/${subscriptionId}`);
      if (response.status === 204) {
        return null;
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assinatura excluída",
        description: "A assinatura foi excluída com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "subscription"] });
      setSubscriptionToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a assinatura. Tente novamente.",
        variant: "destructive",
      });
      setSubscriptionToDelete(null);
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

  const renderStatusBadge = (status: Subscription['status']) => {
    const statusMap = {
      active: { label: "Ativo", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      pending_payment: { label: "Aguardando Pagamento", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      pending_approval: { label: "Aguardando Aprovação", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      expired: { label: "Expirado", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      canceled: { label: "Cancelado", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
    };
    const config = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPlanTypeLabel = (planType: Subscription['planType']) => {
    const planMap = {
      free: "Gratuito",
      monthly: "Mensal",
      quarterly: "Trimestral",
    };
    return planMap[planType] || planType;
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

  const handleDeleteSubscription = (subscriptionId: string) => {
    deleteSubscriptionMutation.mutate(subscriptionId);
  };

  const handleEditSubscription = () => {
    if (currentSubscription) {
      setNewSubscriptionPlanType(currentSubscription.planType);
      setNewSubscriptionStatus(currentSubscription.status);
      setNewSubscriptionExpiresAt(
        currentSubscription.expiresAt 
          ? new Date(currentSubscription.expiresAt).toISOString().split('T')[0]
          : ''
      );
      setIsEditSubscriptionDialogOpen(true);
    }
  };

  const handleDeletePrescription = (prescriptionId: string) => {
    deletePrescriptionMutation.mutate(prescriptionId);
  };

  const handleDownloadPrescription = async (prescriptionId: string) => {
    // Find the full prescription by ID to ensure all data (meals, items) is present
    const fullPrescription = prescriptions?.find((p: Prescription) => p.id === prescriptionId);
    
    if (patient && fullPrescription) {
      toast({
        title: "Preparando o PDF...",
        description: "Seu download começará em breve.",
      });
      
      try {
        // Call the utility function to generate the PDF
        await generatePrescriptionPDF({
          prescription: fullPrescription,
          patient: patient,
          onSuccess: () => {
            toast({
              title: "PDF gerado com sucesso!",
              description: "O arquivo foi baixado para seu dispositivo.",
            });
          },
          onError: (error) => {
            console.error('Error generating PDF:', error);
            toast({
              title: "Erro ao gerar PDF",
              description: "Não foi possível gerar o PDF. Tente novamente.",
              variant: "destructive",
            });
          }
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast({
          title: "Erro ao gerar PDF",
          description: "Não foi possível gerar o PDF. Tente novamente.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível encontrar os dados da prescrição para gerar o PDF.",
        variant: "destructive",
      });
    }
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
            <Button
              onClick={() => createPrescriptionMutation.mutate()}
              disabled={patientLoading || createPrescriptionMutation.isPending || !hasAccountLinked}
              title={!hasAccountLinked ? "Paciente precisa ter um login para criar prescrições" : "Nova Prescrição"}
              data-testid="button-new-prescription"
              className="bg-white/20 hover:bg-white/30 border-white/30 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
            >
              <Plus className="h-5 w-5 mr-2" />
              {createPrescriptionMutation.isPending ? "Criando..." : "Nova Prescrição"}
            </Button>
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
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <TabsTrigger value="current" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium transition-all">Anamnese Atual</TabsTrigger>
                <TabsTrigger value="history" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium transition-all">Histórico</TabsTrigger>
                <TabsTrigger value="subscription" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium transition-all">Assinatura</TabsTrigger>
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

                    {/* Nutritionist calculation fields */}
                    {!historyLoading && (
                      <div className="mt-6">
                        {currentAnamnesisRecord ? (
                          <AnamnesisNutritionistDataForm anamnesis={currentAnamnesisRecord} />
                        ) : (
                          <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200/50 dark:border-yellow-700/50">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
                                <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Dados Nutricionais</h4>
                                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                                  Crie um registro de anamnese para adicionar cálculos nutricionais (TMB, GET, VET)
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => createInitialAnamnesisRecord.mutate()}
                              disabled={createInitialAnamnesisRecord.isPending}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white"
                            >
                              {createInitialAnamnesisRecord.isPending ? "Criando..." : "Criar Registro de Anamnese"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
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
                            
                            {/* Renderiza o novo formulário para dados do nutricionista */}
                            <AnamnesisNutritionistDataForm anamnesis={record} />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="subscription">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl font-bold">Gerenciar Assinatura</CardTitle>
                      </div>
                      <Button
                        onClick={() => setIsCreateSubscriptionDialogOpen(true)}
                        className="bg-white/20 hover:bg-white/30 border-white/30 text-white text-sm px-4 py-2"
                        disabled={!!currentSubscription?.status && currentSubscription.status === 'active'}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Plano
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {currentSubscription ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="h-5 w-5 text-blue-600" />
                              <span className="font-semibold text-blue-600">Plano Atual</span>
                            </div>
                            <p className="text-lg font-bold">{getPlanTypeLabel(currentSubscription.planType)}</p>
                            <div className="mt-2">
                              {renderStatusBadge(currentSubscription.status)}
                            </div>
                          </div>
                          
                          <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-5 w-5 text-green-600" />
                              <span className="font-semibold text-green-600">Validade</span>
                            </div>
                            <p className="text-lg font-bold">
                              {currentSubscription.expiresAt 
                                ? formatDate(currentSubscription.expiresAt.toString()) 
                                : "Sem expiração"
                              }
                            </p>
                          </div>
                        </div>
                        
                        {currentSubscription.startDate && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            <span>Iniciado em: {formatDate(currentSubscription.startDate.toString())}</span>
                          </div>
                        )}

                        {/* Action buttons for editing and deleting subscription */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <Button
                            onClick={handleEditSubscription}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                          >
                            <User className="h-4 w-4 mr-2" />
                            Editar Plano
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                className="px-4 py-2"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir Plano
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza de que deseja excluir a assinatura {getPlanTypeLabel(currentSubscription.planType)} deste paciente?
                                  <div className="mt-2 text-red-600">
                                    Esta ação não pode ser desfeita.
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSubscription(currentSubscription.id)}
                                  disabled={deleteSubscriptionMutation.isPending}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteSubscriptionMutation.isPending ? "Excluindo..." : "Excluir"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          Este paciente ainda não possui uma assinatura ativa.
                        </p>
                        <Button
                          onClick={() => setIsCreateSubscriptionDialogOpen(true)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Primeiro Plano
                        </Button>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPrescription(prescription.id)}
                            data-testid={`button-download-prescription-${prescription.id}`}
                            className="bg-green-100 hover:bg-green-200 text-green-700 border border-green-200 dark:bg-green-800 dark:hover:bg-green-700 dark:text-green-200 dark:border-green-700 transition-all duration-200 rounded-lg"
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            Baixar
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
                        disabled={patientLoading || createPrescriptionMutation.isPending}
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
                        {entry.imageUrl && (
                          <div className="aspect-square relative group">
                            <img 
                              src={entry.imageUrl} 
                              alt="Foto da refeição" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW0gbsOjbyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg==';
                              }}
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEntryToDelete(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                              {formatDate(entry.date)}
                            </div>
                          </div>
                        )}
                        
                        {/* Visual header for mood-only entries */}
                        {!entry.imageUrl && (entry.moodBefore || entry.moodAfter) && (
                          <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 p-4 border-b border-purple-200/50 dark:border-purple-700/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Smile className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Registro de Humor</span>
                              </div>
                              <div className="text-xs text-purple-600 dark:text-purple-400">
                                {formatDate(entry.date)}
                              </div>
                            </div>
                          </div>
                        )}
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum registro no diário</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                    O paciente ainda não enviou fotos ou registros de humor para as refeições. Os dados aparecerão aqui quando forem enviados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* AlertDialog for photo deletion confirmation */}
      <AlertDialog
        open={!!entryToDelete}
        onOpenChange={(isOpen) => !isOpen && setEntryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir esta entrada do diário alimentar? Tanto a foto quanto todas as informações associadas serão removidas permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (entryToDelete) {
                  deletePhotoMutation.mutate(entryToDelete);
                }
              }}
              disabled={deletePhotoMutation.isPending}
            >
              {deletePhotoMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Create Subscription Dialog */}
      <Dialog open={isCreateSubscriptionDialogOpen} onOpenChange={setIsCreateSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Assinatura</DialogTitle>
            <DialogDescription>
              Crie uma nova assinatura para o paciente {patient?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="planType">Tipo de Plano</Label>
              <Select value={newSubscriptionPlanType} onValueChange={(value) => setNewSubscriptionPlanType(value as Subscription['planType'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status Inicial</Label>
              <Select value={newSubscriptionStatus} onValueChange={(value) => setNewSubscriptionStatus(value as Subscription['status'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
                  <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expiration date field for all plan types */}
            <div>
              <Label htmlFor="expiresAt">Data de Expiração</Label>
              <Input
                type="date"
                value={newSubscriptionExpiresAt}
                onChange={(e) => setNewSubscriptionExpiresAt(e.target.value)}
                placeholder="Defina uma data de expiração personalizada"
              />
              <p className="text-xs text-gray-500 mt-1">
                {newSubscriptionPlanType === 'free' 
                  ? 'Para planos gratuitos, deixe em branco para "sem expiração" ou defina uma data para controle interno'
                  : `Se não informada, será calculada automaticamente: ${newSubscriptionPlanType === 'monthly' ? '1 mês' : '3 meses'} a partir de hoje`
                }
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSubscriptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createSubscriptionMutation.mutate({ 
                planType: newSubscriptionPlanType, 
                status: newSubscriptionStatus,
                expiresAt: newSubscriptionExpiresAt || undefined
              })}
              disabled={createSubscriptionMutation.isPending}
            >
              {createSubscriptionMutation.isPending ? "Criando..." : "Criar Assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditSubscriptionDialogOpen} onOpenChange={setIsEditSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
            <DialogDescription>
              Edite a assinatura do paciente {patient?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="planType">Tipo de Plano</Label>
              <Select value={newSubscriptionPlanType} onValueChange={(value) => setNewSubscriptionPlanType(value as Subscription['planType'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={newSubscriptionStatus} onValueChange={(value) => setNewSubscriptionStatus(value as Subscription['status'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
                  <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expiration date field for all plan types */}
            <div>
              <Label htmlFor="expiresAt">Data de Expiração</Label>
              <Input
                type="date"
                value={newSubscriptionExpiresAt}
                onChange={(e) => setNewSubscriptionExpiresAt(e.target.value)}
                placeholder="Defina uma data de expiração personalizada"
              />
              <p className="text-xs text-gray-500 mt-1">
                {newSubscriptionPlanType === 'free' 
                  ? 'Para planos gratuitos, deixe em branco para "sem expiração" ou defina uma data para controle interno'
                  : 'Defina a data de expiração do plano'
                }
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSubscriptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (currentSubscription) {
                  editSubscriptionMutation.mutate({ 
                    subscriptionId: currentSubscription.id,
                    planType: newSubscriptionPlanType, 
                    status: newSubscriptionStatus,
                    expiresAt: newSubscriptionExpiresAt || undefined
                  });
                }
              }}
              disabled={editSubscriptionMutation.isPending}
            >
              {editSubscriptionMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}