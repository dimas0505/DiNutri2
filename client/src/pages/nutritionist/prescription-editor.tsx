import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Copy } from "lucide-react";
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
    onSuccess: (data) => {
      setTitle(data.title);
      setGeneralNotes(data.generalNotes || "");
      setMeals(data.meals || []);
    },
  });

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
        <main className="max-w-4xl mx-auto p-4 lg:p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </main>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Prescrição não encontrada" />
        <main className="max-w-4xl mx-auto p-4 lg:p-6">
          <p className="text-center text-muted-foreground">Prescrição não encontrada.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        leftElement={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/patients/${prescription.patientId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
        rightElement={
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={updatePrescriptionMutation.isPending}
              data-testid="button-save-draft"
            >
              Salvar Rascunho
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishPrescriptionMutation.isPending}
              data-testid="button-publish"
            >
              Publicar
            </Button>
          </div>
        }
      >
        <div>
          <Input
            className="text-xl font-bold border-none outline-none bg-transparent p-0 h-auto"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da prescrição"
            data-testid="input-prescription-title"
          />
          <p className="text-sm text-muted-foreground mt-1">
            {patient?.name} • 
            <Badge variant={prescription.status === 'published' ? 'default' : 'secondary'} className="ml-2">
              {prescription.status === 'published' ? 'Publicado' : 'Rascunho'}
            </Badge>
          </p>
        </div>
      </Header>

      <main className="max-w-4xl mx-auto p-4 lg:p-6">
        {/* Prescription Tools */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Button
            onClick={addMeal}
            className="flex items-center space-x-2"
            data-testid="button-add-meal"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar Refeição</span>
          </Button>
          <Button
            variant="outline"
            className="flex items-center space-x-2"
            data-testid="button-duplicate-prescription"
          >
            <Copy className="h-4 w-4" />
            <span>Duplicar Prescrição Anterior</span>
          </Button>
        </div>

        {/* Meals List */}
        <div className="space-y-6">
          {meals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">Nenhuma refeição adicionada ainda.</p>
                <Button onClick={addMeal} data-testid="button-add-first-meal">
                  Adicionar Primeira Refeição
                </Button>
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

        {/* General Notes */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <label className="block text-lg font-medium mb-3">Observações Gerais</label>
            <Textarea
              className="h-24"
              placeholder="Observações gerais sobre a prescrição..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              data-testid="textarea-general-notes"
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
