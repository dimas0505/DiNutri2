import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Copy, Upload, Download, Calendar as CalendarIcon, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import MealEditor from "@/components/prescription/meal-editor";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Prescription, Patient, MealData, MealItemData } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';
import { DefaultMobileDrawer } from "@/components/layout/mobile-layout";

interface PrescriptionEditorPageProps {
  params: { id: string };
}

/** Retorna o label e a variante do badge de acordo com o status da prescrição. */
function getPrescriptionStatusBadge(status: Prescription["status"]): { label: string; className: string } {
  switch (status) {
    case "preparing":
      return { label: "Plano em Preparação", className: "bg-orange-100 text-orange-800 border-orange-200" };
    case "active":
      return { label: "Ativo", className: "bg-green-100 text-green-800 border-green-200" };
    case "published":
      return { label: "Publicado", className: "bg-blue-100 text-blue-800 border-blue-200" };
    default:
      return { label: "Rascunho", className: "bg-gray-100 text-gray-700 border-gray-200" };
  }
}

export default function PrescriptionEditorPage({ params }: PrescriptionEditorPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [meals, setMeals] = useState<MealData[]>([]);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Duplicate prescription dialog state
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>("");

  // Activation confirmation dialog state
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);

  const { data: prescription, isLoading } = useQuery<Prescription>({
    queryKey: ["/api/prescriptions", params.id],
  });

  // Update state when prescription data changes
  useEffect(() => {
    if (prescription) {
      setTitle(prescription.title);
      setGeneralNotes(prescription.generalNotes || "");
      setMeals(prescription.meals || []);
      setExpiresAt(prescription.expiresAt ? new Date(prescription.expiresAt) : undefined);
    }
  }, [prescription]);

  const { data: patient } = useQuery<Patient>({
    queryKey: ["/api/patients", prescription?.patientId],
    enabled: !!prescription?.patientId,
  });

  // Fetch all patients for duplication dialog
  const { data: allPatients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch prescriptions for selected patient in duplication dialog
  const { data: selectedPatientPrescriptions } = useQuery<Prescription[]>({
    queryKey: ["/api/patients", selectedPatientId, "prescriptions"],
    enabled: !!selectedPatientId,
  });

  // Memoized filtered patients list (excluding current patient)
  const availablePatients = useMemo(() => {
    return allPatients?.filter(p => p.id !== prescription?.patientId) || [];
  }, [allPatients, prescription?.patientId]);

  // Memoized source prescription
  const sourcePrescription = useMemo(() => {
    return selectedPatientPrescriptions?.find(p => p.id === selectedPrescriptionId);
  }, [selectedPatientPrescriptions, selectedPrescriptionId]);

  const invalidatePrescriptionQueries = () => {
    const patientId = prescription?.patientId;

    queryClient.invalidateQueries({ queryKey: ["/api/prescriptions", params.id] });
    queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patient/my-prescriptions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patients"] });

    if (patientId) {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId] });
    }
  };

  const updatePrescriptionMutation = useMutation({
    mutationFn: async (data: { title: string; meals: MealData[]; generalNotes: string; expiresAt?: Date }) => {
      // Pass Date object directly - the backend validation will handle the conversion
      const payload = {
        ...data,
        expiresAt: data.expiresAt ?? null,
      };
      return await apiRequest("PUT", `/api/prescriptions/${params.id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Prescrição salva.",
      });
      invalidatePrescriptionQueries();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar prescrição.",
        variant: "destructive",
      });
    },
  });

  const publishPrescriptionMutation = useMutation({
    mutationFn: async () => {
      // First update, then publish
      await updatePrescriptionMutation.mutateAsync({ title, meals, generalNotes, expiresAt });
      return await apiRequest("POST", `/api/prescriptions/${params.id}/publish`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Prescrição publicada com sucesso!",
      });
      invalidatePrescriptionQueries();
      if (patient) {
        setLocation(`/patients/${patient.id}`);
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao publicar prescrição.",
        variant: "destructive",
      });
    },
  });

  /**
   * Mutation de ativação: salva o rascunho atual e depois ativa o plano.
   * Define status = "active" e startDate = agora. O expiresAt definido pelo nutricionista é preservado.
   */
  const activatePrescriptionMutation = useMutation({
    mutationFn: async () => {
      // Salva o conteúdo atual (incluindo expiresAt) antes de ativar
      await updatePrescriptionMutation.mutateAsync({ title, meals, generalNotes, expiresAt });
      return await apiRequest("POST", `/api/prescriptions/${params.id}/activate`, {});
    },
    onSuccess: () => {
      toast({
        title: "Plano Ativado!",
        description: "O plano alimentar foi ativado e já está disponível para o paciente.",
      });
      invalidatePrescriptionQueries();
      if (patient) {
        setLocation(`/patients/${patient.id}`);
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao ativar o plano alimentar.",
        variant: "destructive",
      });
    },
  });

  const deactivatePrescriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/prescriptions/${params.id}/deactivate`, {});
    },
    onSuccess: () => {
      toast({
        title: "Plano Desativado",
        description: "O plano alimentar foi desativado. O paciente não terá mais acesso.",
      });
      invalidatePrescriptionQueries();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao desativar o plano alimentar.",
        variant: "destructive",
      });
    },
  });

  const duplicatePrescriptionMutation = useMutation({
    mutationFn: async ({ sourcePrescriptionId, targetPatientId, newTitle }: { sourcePrescriptionId: string; targetPatientId: string; newTitle: string }) => {
      const response = await apiRequest("POST", `/api/prescriptions/${sourcePrescriptionId}/duplicate-to-patient`, {
        targetPatientId,
        title: newTitle,
      });
      return response.json();
    },
    onSuccess: (response: { id?: string }) => {
      toast({
        title: "Sucesso",
        description: "Prescrição duplicada com sucesso!",
      });
      setIsDuplicateDialogOpen(false);
      setSelectedPatientId("");
      setSelectedPrescriptionId("");
      // Navigate to the new prescription
      if (response && response.id) {
        setLocation(`/prescriptions/${response.id}/edit`);
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao duplicar prescrição.",
        variant: "destructive",
      });
    },
  });

  const addMeal = () => {
    const newMeal: MealData = {
      id: uuidv4(),
      name: "Nova Refeição",
      items: [],
      notes: "",
    };
    setMeals([...meals, newMeal]);
  };

  const updateMeal = (mealId: string, updatedMeal: MealData) => {
    setMeals(meals.map(meal => meal.id === mealId ? updatedMeal : meal));
  };

  const deleteMeal = (mealId: string) => {
    setMeals(meals.filter(meal => meal.id !== mealId));
  };

  const moveMeal = (fromIndex: number, toIndex: number) => {
    const newMeals = [...meals];
    const [moved] = newMeals.splice(fromIndex, 1);
    newMeals.splice(toIndex, 0, moved);
    setMeals(newMeals);
  };

  const handleSaveDraft = () => {
    updatePrescriptionMutation.mutate({ title, meals, generalNotes, expiresAt });
  };

  const handlePublish = () => {
    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "O título da prescrição é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    publishPrescriptionMutation.mutate();
  };

  const handleOpenActivateDialog = () => {
    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "O título da prescrição é obrigatório antes de ativar.",
        variant: "destructive",
      });
      return;
    }
    setIsActivateDialogOpen(true);
  };

  const handleConfirmActivate = () => {
    setIsActivateDialogOpen(false);
    activatePrescriptionMutation.mutate();
  };

  const handleOpenDuplicateDialog = () => {
    setIsDuplicateDialogOpen(true);
  };

  const handleDuplicatePrescription = () => {
    if (!selectedPrescriptionId) {
      toast({
        title: "Erro",
        description: "Selecione uma prescrição para duplicar.",
        variant: "destructive",
      });
      return;
    }

    // Use the memoized source prescription
    const newTitle = sourcePrescription?.title ? `${sourcePrescription.title} (cópia)` : "Prescrição duplicada";

    duplicatePrescriptionMutation.mutate({
      sourcePrescriptionId: selectedPrescriptionId,
      targetPatientId: prescription?.patientId || "",
      newTitle,
    });
  };

  // CSV parsing function
  const parseCsvToMeals = (csvText: string): MealData[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV deve conter pelo menos o cabeçalho e uma linha de dados');
    }

    // Remove header
    const dataLines = lines.slice(1);
    
    // Group lines by meal name
    const mealGroups = dataLines.reduce((groups, line) => {
      const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
      
      if (columns.length < 5) {
        throw new Error('CSV deve conter 5 colunas: Refeicao,ItemPrincipal,Quantidade,Substitutos,ObservacoesRefeicao');
      }

      const [mealName, itemDescription, amount, substitutesStr, mealNotes] = columns;
      
      if (!groups[mealName]) {
        groups[mealName] = {
          items: [],
          notes: mealNotes || ''
        };
      }
      
      // Create meal item
      const mealItem: MealItemData = {
        id: uuidv4(),
        description: itemDescription,
        amount: amount,
        substitutes: substitutesStr ? substitutesStr.split('|').map(s => s.trim()).filter(s => s) : []
      };
      
      groups[mealName].items.push(mealItem);
      
      return groups;
    }, {} as Record<string, { items: MealItemData[], notes: string }>);

    // Convert to MealData array
    return Object.entries(mealGroups).map(([mealName, mealData]) => ({
      id: uuidv4(),
      name: mealName,
      items: mealData.items,
      notes: mealData.notes
    }));
  };

  // File input change handler
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const parsedMeals = parseCsvToMeals(csvText);
        setMeals(parsedMeals);
        toast({
          title: "Sucesso",
          description: `${parsedMeals.length} refeição(ões) importada(s) do CSV.`,
        });
      } catch (error) {
        toast({
          title: "Erro ao importar CSV",
          description: error instanceof Error ? error.message : "Formato inválido",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportCsv = () => {
    fileInputRef.current?.click();
  };

  const handleExportJson = () => {
    if (!prescription) return;

    const exportData = {
      title: title,
      generalNotes: generalNotes,
      meals: meals,
      exportedAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plano-alimentar.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Sucesso",
      description: "Plano alimentar exportado com sucesso!",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Carregando..." />
        <main className="max-w-4xl mx-auto p-4 lg:p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </main>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          title="Prescrição não encontrada"
          showBack={true}
          onBack={() => setLocation("/")}
        />
        <main className="max-w-4xl mx-auto p-4 lg:p-6">
          <p className="text-center text-muted-foreground">Prescrição não encontrada.</p>
        </main>
      </div>
    );
  }

  const isSaving = updatePrescriptionMutation.isPending || publishPrescriptionMutation.isPending || activatePrescriptionMutation.isPending || deactivatePrescriptionMutation.isPending;
  const statusBadge = getPrescriptionStatusBadge(prescription.status as Prescription["status"]);

  // Prescrição pode ser ativada se estiver em "preparing" ou "draft"
  const canActivate = prescription.status === "preparing" || prescription.status === "draft";
  // Prescrição já foi ativada ou publicada
  const isAlreadyActive = prescription.status === "active" || prescription.status === "published";

  return (
    <div className="min-h-screen bg-background">
      <Header
        title={title || "Editor de Prescrição"}
        subtitle={patient?.name}
        showBack={true}
        onBack={() => setLocation(`/patients/${prescription.patientId}`)}
        drawerContent={<DefaultMobileDrawer />}
      />
      <main className="max-w-5xl mx-auto p-3 sm:p-4 lg:p-8">
        {/* Enhanced Header Section */}
        <Card className="mb-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 via-card to-purple-50 dark:from-blue-950/20 dark:via-card dark:to-purple-950/20">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-4 lg:space-y-0 lg:flex lg:justify-between lg:items-center lg:gap-6">
              <div className="flex-1 w-full space-y-3">
                <Input
                  className="text-2xl sm:text-3xl font-bold h-auto p-3 sm:p-4 border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:bg-muted/10 rounded-lg"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título da prescrição"
                  data-testid="input-prescription-title"
                />
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{patient?.name}</span>
                  <span className="hidden sm:inline">•</span>
                  <Badge
                    variant="secondary"
                    className={cn("px-3 py-1 font-medium shadow-sm", statusBadge.className)}
                    data-testid="badge-prescription-status"
                  >
                    {statusBadge.label}
                  </Badge>
                </div>
              </div>
              
              {/* Mobile Button Layout */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/patients/${prescription.patientId}`)}
                  disabled={isSaving}
                  data-testid="button-close-editor"
                  className="w-full sm:w-auto shadow-sm border-2 hover:bg-muted/20"
                >
                  Fechar
                </Button>
                <Button
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    data-testid="button-save-draft"
                    className="w-full sm:w-auto shadow-md bg-gradient-to-r from-secondary via-secondary to-secondary/90 hover:from-secondary/90 hover:via-secondary hover:to-secondary"
                  >
                    {updatePrescriptionMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                {canActivate && (
                  <Button
                    onClick={handleOpenActivateDialog}
                    disabled={isSaving}
                    data-testid="button-activate-plan"
                    className="w-full sm:w-auto shadow-lg bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:via-orange-600 hover:to-amber-600 text-white"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {activatePrescriptionMutation.isPending ? "Ativando..." : "Ativar Plano Alimentar"}
                  </Button>
                )}
                {/* Manter botão Publicar apenas para compatibilidade com fluxo legado */}
                {prescription.status === "draft" && (
                  <Button
                    onClick={handlePublish}
                    disabled={isSaving}
                    data-testid="button-publish"
                    className="w-full sm:w-auto shadow-lg bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary"
                  >
                    {publishPrescriptionMutation.isPending ? "Publicando..." : "Publicar"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Enhanced Prescription Controls */}
        <Card className="mb-6 shadow-lg bg-gradient-to-r from-emerald-50 via-card to-teal-50 dark:from-emerald-950/20 dark:via-card dark:to-teal-950/20 border-2 border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4 sm:p-6">
            {/* Hidden file input for CSV import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="space-y-3 sm:space-y-0 sm:flex sm:justify-center sm:gap-4">
              <Button
                onClick={addMeal}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 shadow-lg bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 hover:from-emerald-700 hover:via-emerald-600 hover:to-green-700 text-white"
                size="lg"
                data-testid="button-add-meal"
              >
                <Plus className="h-5 w-5" />
                <span>Adicionar Refeição</span>
              </Button>
              <Button
                onClick={handleImportCsv}
                variant="outline"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 shadow-md border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 via-background to-indigo-50 dark:from-blue-950/30 dark:via-background dark:to-indigo-950/30 hover:from-blue-100 hover:via-muted hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:via-muted dark:hover:to-indigo-900/50"
                size="lg"
                data-testid="button-import-csv"
              >
                <Upload className="h-5 w-5" />
                <span className="hidden sm:inline">Importar de Planilha (CSV)</span>
                <span className="sm:hidden">Importar CSV</span>
              </Button>
              <Button
                onClick={handleExportJson}
                variant="outline"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 shadow-md border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 via-background to-violet-50 dark:from-purple-950/30 dark:via-background dark:to-violet-950/30 hover:from-purple-100 hover:via-muted hover:to-violet-100 dark:hover:from-purple-900/50 dark:hover:via-muted dark:hover:to-violet-900/50"
                size="lg"
                data-testid="button-export-json"
              >
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline">Exportar (JSON)</span>
                <span className="sm:hidden">Exportar JSON</span>
              </Button>
              <Button
                onClick={handleOpenDuplicateDialog}
                variant="outline"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 shadow-md border-2 border-teal-200 dark:border-teal-800 bg-gradient-to-r from-teal-50 via-background to-cyan-50 dark:from-teal-950/30 dark:via-background dark:to-cyan-950/30 hover:from-teal-100 hover:via-muted hover:to-cyan-100 dark:hover:from-teal-900/50 dark:hover:via-muted dark:hover:to-cyan-900/50"
                size="lg"
                data-testid="button-duplicate-prescription"
              >
                <Copy className="h-5 w-5" />
                <span className="hidden sm:inline">Duplicar Prescrição Anterior</span>
                <span className="sm:hidden">Duplicar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Meals List */}
        <div className="space-y-6">
          {meals.length === 0 ? (
            <Card className="shadow-xl bg-gradient-to-br from-amber-50 via-card to-orange-50 dark:from-amber-950/20 dark:via-card dark:to-orange-950/20 border-2 border-amber-100 dark:border-amber-900/30">
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <p className="text-muted-foreground text-lg">Nenhuma refeição adicionada ainda.</p>
                  <Button 
                    onClick={addMeal} 
                    data-testid="button-add-first-meal" 
                    size="lg" 
                    className="shadow-lg bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 hover:from-amber-700 hover:via-orange-600 hover:to-red-600 text-white"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Primeira Refeição
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            meals.map((meal, index) => (
              <MealEditor
                key={meal.id}
                meal={meal}
                onUpdate={(updatedMeal) => updateMeal(meal.id, updatedMeal)}
                onDelete={() => deleteMeal(meal.id)}
                onMoveUp={index > 0 ? () => moveMeal(index, index - 1) : undefined}
                onMoveDown={index < meals.length - 1 ? () => moveMeal(index, index + 1) : undefined}
              />
            ))
          )}
        </div>

        {/* Enhanced General Notes */}
        <Card className="mt-8 shadow-xl bg-gradient-to-br from-indigo-50 via-card to-purple-50 dark:from-indigo-950/20 dark:via-card dark:to-purple-950/20 border-2 border-indigo-100 dark:border-indigo-900/30">
          <CardContent className="p-6 sm:p-8">
            <div className="space-y-4">
              <label className="block text-lg sm:text-xl font-semibold text-foreground">Observações Gerais</label>
              <Textarea
                className="min-h-[120px] text-base leading-relaxed bg-background/80 border-2 border-indigo-200 dark:border-indigo-800 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:border-indigo-400 dark:focus-visible:ring-indigo-700 dark:focus-visible:border-indigo-600 shadow-inner"
                placeholder="Observações gerais sobre a prescrição..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                data-testid="textarea-general-notes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Data de Validade — editável em qualquer estado do plano */}
        <Card className="mt-6 shadow-xl bg-gradient-to-br from-rose-50 via-card to-pink-50 dark:from-rose-950/20 dark:via-card dark:to-pink-950/20 border-2 border-rose-100 dark:border-rose-900/30">
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expires-at" className="text-lg sm:text-xl font-semibold text-foreground">
                    Data de Validade (Opcional)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Defina até quando esta prescrição será válida para o paciente. Esta data pode ser editada mesmo após a ativação do plano.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[280px] justify-start text-left font-normal",
                          !expiresAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiresAt ? format(expiresAt, "PPP", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={expiresAt}
                        onSelect={setExpiresAt}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {expiresAt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpiresAt(undefined)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Remover data
                    </Button>
                  )}
                </div>
                {expiresAt && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Atenção:</strong> Esta prescrição expirará em {format(expiresAt, "PPP", { locale: ptBR })} e não estará mais acessível ao paciente após esta data.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        {/* Informações do plano ativo */}
        {isAlreadyActive && prescription.startDate && (
          <Card className="mt-6 shadow-xl bg-gradient-to-br from-green-50 via-card to-emerald-50 dark:from-green-950/20 dark:via-card dark:to-emerald-950/20 border-2 border-green-100 dark:border-green-900/30">
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-green-800 dark:text-green-200">Plano Ativo</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Início: {format(new Date(prescription.startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                {prescription.expiresAt && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Validade: {format(new Date(prescription.expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deactivatePrescriptionMutation.mutate()}
                    disabled={deactivatePrescriptionMutation.isPending}
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/20"
                  >
                    {deactivatePrescriptionMutation.isPending ? "Desativando..." : "Inativar Plano"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ao inativar, o paciente perderá o acesso ao plano até que seja reativado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Activation Confirmation Dialog */}
      <AlertDialog open={isActivateDialogOpen} onOpenChange={setIsActivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Ativar Plano Alimentar
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Você está prestes a ativar o plano alimentar <strong className="text-foreground">"{title}"</strong> para o paciente <strong className="text-foreground">{patient?.name}</strong>.
                </p>
                <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 p-3 space-y-1">
                  <p className="font-medium text-orange-800 dark:text-orange-200">O que acontecerá:</p>
                  <ul className="list-disc list-inside space-y-1 text-orange-700 dark:text-orange-300">
                    <li>Status mudará para <strong>Ativo</strong></li>
                    <li>Data de início será definida como <strong>hoje</strong></li>
                    {expiresAt && <li>Validade definida para: <strong>{format(expiresAt, "dd/MM/yyyy", { locale: ptBR })}</strong></li>}
                    <li>O paciente terá acesso imediato ao plano</li>
                  </ul>
                </div>
                <p>Deseja continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmActivate}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-confirm-activate"
            >
              <Zap className="h-4 w-4 mr-2" />
              Ativar Plano
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Prescription Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Duplicar Prescrição de Outro Paciente</DialogTitle>
            <DialogDescription>
              Selecione um paciente e uma prescrição existente para duplicar para {patient?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient-select">Paciente</Label>
              {availablePatients.length > 0 ? (
                <Select
                  value={selectedPatientId}
                  onValueChange={(value) => {
                    setSelectedPatientId(value);
                    setSelectedPrescriptionId(""); // Reset prescription selection when patient changes
                  }}
                >
                  <SelectTrigger id="patient-select">
                    <SelectValue placeholder="Selecione um paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Nenhum outro paciente disponível
                </div>
              )}
            </div>

            {selectedPatientId && (
              <div className="space-y-2">
                <Label htmlFor="prescription-select">Prescrição</Label>
                {selectedPatientPrescriptions && selectedPatientPrescriptions.length > 0 ? (
                  <Select
                    value={selectedPrescriptionId}
                    onValueChange={setSelectedPrescriptionId}
                  >
                    <SelectTrigger id="prescription-select">
                      <SelectValue placeholder="Selecione uma prescrição" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPatientPrescriptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title} ({p.status === 'published' ? 'Publicado' : p.status === 'active' ? 'Ativo' : p.status === 'preparing' ? 'Em Preparação' : 'Rascunho'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                    Este paciente não possui prescrições
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDuplicateDialogOpen(false);
                setSelectedPatientId("");
                setSelectedPrescriptionId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDuplicatePrescription}
              disabled={!selectedPrescriptionId || duplicatePrescriptionMutation.isPending}
            >
              {duplicatePrescriptionMutation.isPending ? "Duplicando..." : "Duplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
