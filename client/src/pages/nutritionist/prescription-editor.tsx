import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Copy } from "lucide-react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MealEditor from "@/components/prescription/meal-editor";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Prescription, Patient, MealData } from "@shared/schema";
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
      return await apiRequest("POST", `/api/prescriptions/${params.id}/publish`);
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
      <main className="max-w-5xl mx-auto p-6 lg:p-8">
        {/* Enhanced Header Section */}
        <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-card via-card to-card/95">
          <CardContent className="p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex-1 w-full space-y-3">
                <Input
                  className="text-3xl font-bold h-auto p-3 border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:bg-muted/10 rounded-lg"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título da prescrição"
                  data-testid="input-prescription-title"
                />
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="font-medium">{patient?.name}</span>
                  <span>•</span>
                  <Badge 
                    variant={prescription.status === 'published' ? 'default' : 'secondary'} 
                    className="px-3 py-1 font-medium"
                  >
                    {prescription.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/patients/${prescription.patientId}`)}
                  disabled={isSaving}
                  data-testid="button-close-editor"
                  className="flex-1 lg:flex-none"
                >
                  Fechar
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  data-testid="button-save-draft"
                  className="flex-1 lg:flex-none"
                >
                  {updatePrescriptionMutation.isPending ? "Salvando..." : "Salvar Rascunho"}
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isSaving}
                  data-testid="button-publish"
                  className="flex-1 lg:flex-none shadow-md"
                >
                  {publishPrescriptionMutation.isPending ? "Publicando..." : "Publicar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Enhanced Prescription Controls */}
        <Card className="mb-8 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={addMeal}
                className="flex items-center justify-center space-x-2 shadow-sm"
                size="lg"
                data-testid="button-add-meal"
              >
                <Plus className="h-5 w-5" />
                <span>Adicionar Refeição</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center space-x-2 shadow-sm"
                size="lg"
                data-testid="button-duplicate-prescription"
              >
                <Copy className="h-5 w-5" />
                <span>Duplicar Prescrição Anterior</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Meals List */}
        <div className="space-y-8">
          {meals.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <p className="text-muted-foreground text-lg">Nenhuma refeição adicionada ainda.</p>
                  <Button onClick={addMeal} data-testid="button-add-first-meal" size="lg" className="shadow-sm">
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
        <Card className="mt-12 shadow-lg bg-gradient-to-br from-muted/20 via-card to-muted/10">
          <CardContent className="p-8">
            <div className="space-y-4">
              <label className="block text-xl font-semibold text-foreground">Observações Gerais</label>
              <Textarea
                className="min-h-[120px] text-base leading-relaxed bg-background/50 border-2 focus-visible:ring-2 focus-visible:ring-ring/20"
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