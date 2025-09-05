import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Copy, Upload, Download, CalendarIcon } from "lucide-react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import MealEditor from "@/components/prescription/meal-editor";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Prescription, Patient, MealData, MealItemData } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';
import { DefaultMobileDrawer } from "@/components/layout/mobile-layout";

interface PrescriptionEditorPageProps {
  params: { id: string };
}

export default function PrescriptionEditorPage({ params }: PrescriptionEditorPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [meals, setMeals] = useState<MealData[]>([]);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: prescription, isLoading } = useQuery<Prescription>({
    queryKey: ["/api/prescriptions", params.id],
  });

  // Update state when prescription data changes
  useEffect(() => {
    if (prescription) {
      setTitle(prescription.title);
      setGeneralNotes(prescription.generalNotes || "");
      setMeals(prescription.meals || []);
    }
  }, [prescription]);

  const { data: patient } = useQuery<Patient>({
    queryKey: ["/api/patients", prescription?.patientId],
    enabled: !!prescription?.patientId,
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: async (data: { title: string; meals: MealData[]; generalNotes: string }) => {
      return await apiRequest("PUT", `/api/prescriptions/${params.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Prescrição salva como rascunho.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions", params.id] });
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
      await updatePrescriptionMutation.mutateAsync({ title, meals, generalNotes });
      return await apiRequest("POST", `/api/prescriptions/${params.id}/publish`, { 
        expiresAt: expiresAt?.toISOString() 
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Prescrição publicada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions", params.id] });
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
    updatePrescriptionMutation.mutate({ title, meals, generalNotes });
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
          description: `${parsedMeals.length} refeição(ões) importada(s) com sucesso!`,
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: error instanceof Error ? error.message : "Erro ao processar arquivo CSV.",
          variant: "destructive",
        });
      } finally {
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast({
        title: "Erro",
        description: "Erro ao ler o arquivo.",
        variant: "destructive",
      });
    };

    reader.readAsText(file);
  };

  // Import CSV handler
  const handleImportCsv = () => {
    fileInputRef.current?.click();
  };

  // Export JSON handler
  const handleExportJson = () => {
    const exportData = {
      title,
      generalNotes,
      meals
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

  const isSaving = updatePrescriptionMutation.isPending || publishPrescriptionMutation.isPending;

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
                    variant={prescription.status === 'published' ? 'default' : 'secondary'} 
                    className="px-3 py-1 font-medium shadow-sm"
                  >
                    {prescription.status === 'published' ? 'Publicado' : 'Rascunho'}
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
                  {updatePrescriptionMutation.isPending ? "Salvando..." : "Salvar Rascunho"}
                </Button>
                
                {/* Date Picker for Expiration */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-auto justify-start text-left font-normal shadow-sm border-2",
                        !expiresAt && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiresAt ? format(expiresAt, "PPP") : "Definir Validade"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={setExpiresAt}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  onClick={handlePublish}
                  disabled={isSaving}
                  data-testid="button-publish"
                  className="w-full sm:w-auto shadow-lg bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary"
                >
                  {publishPrescriptionMutation.isPending ? "Publicando..." : "Publicar"}
                </Button>
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
      </main>
    </div>
  );
}