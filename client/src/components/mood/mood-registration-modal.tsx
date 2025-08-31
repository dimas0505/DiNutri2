import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoodSelector } from "./mood-selector";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MoodType, MealData } from "@shared/schema";

interface MoodRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  meal: MealData;
  prescriptionId: string;
  patientId: string;
}

interface MoodEntryData {
  id?: string;
  moodBefore?: MoodType;
  moodAfter?: MoodType;
  notes?: string;
}

export function MoodRegistrationModal({
  isOpen,
  onClose,
  meal,
  prescriptionId,
  patientId,
}: MoodRegistrationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"before" | "after">("before");
  const [moodBefore, setMoodBefore] = useState<MoodType | undefined>();
  const [moodAfter, setMoodAfter] = useState<MoodType | undefined>();
  const [notes, setNotes] = useState("");

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Buscar registro de humor existente para hoje
  const { data: existingMoodEntry, isLoading } = useQuery<MoodEntryData>({
    queryKey: ["/api/mood-entries", prescriptionId, meal.id, today],
    enabled: isOpen,
    retry: false,
  });

  // Atualizar estado quando dados existentes chegarem
  useEffect(() => {
    if (existingMoodEntry) {
      setMoodBefore(existingMoodEntry.moodBefore);
      setMoodAfter(existingMoodEntry.moodAfter);
      setNotes(existingMoodEntry.notes || "");
    } else {
      // Limpar estado se não houver registro existente
      setMoodBefore(undefined);
      setMoodAfter(undefined);
      setNotes("");
    }
  }, [existingMoodEntry]);

  const saveMoodMutation = useMutation({
    mutationFn: async (data: {
      moodBefore?: MoodType;
      moodAfter?: MoodType;
      notes?: string;
    }) => {
      const payload = {
        patientId,
        prescriptionId,
        mealId: meal.id,
        date: today,
        ...data,
      };

      if (existingMoodEntry?.id) {
        // Atualizar registro existente
        return await apiRequest("PUT", `/api/mood-entries/${existingMoodEntry.id}`, payload);
      } else {
        // Criar novo registro
        return await apiRequest("POST", "/api/mood-entries", payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Humor registrado!",
        description: "Seu humor foi salvo com sucesso.",
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/mood-entries", prescriptionId, meal.id, today] 
      });
      onClose();
    },
    onError: (error: any) => {
      console.error("Error saving mood:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar seu humor. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!moodBefore && !moodAfter) {
      toast({
        title: "Selecione um humor",
        description: "Você precisa registrar pelo menos o humor antes ou depois da refeição.",
        variant: "destructive",
      });
      return;
    }

    saveMoodMutation.mutate({
      moodBefore,
      moodAfter,
      notes: notes.trim() || undefined,
    });
  };

  const handleClose = () => {
    onClose();
    // Não limpar o estado aqui, pois ele será limpo quando o modal abrir novamente
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Humor - {meal.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "before" | "after")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="before" className="flex items-center space-x-2">
              <span>🍽️</span>
              <span>Antes da Refeição</span>
              {moodBefore && <span className="ml-2 text-green-600">✓</span>}
            </TabsTrigger>
            <TabsTrigger value="after" className="flex items-center space-x-2">
              <span>😋</span>
              <span>Depois da Refeição</span>
              {moodAfter && <span className="ml-2 text-green-600">✓</span>}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="before">
              <MoodSelector
                title="Como você está se sentindo ANTES de comer?"
                selectedMood={moodBefore}
                onMoodChange={setMoodBefore}
                notes={notes}
                onNotesChange={setNotes}
                showNotes={true}
              />
            </TabsContent>

            <TabsContent value="after">
              <MoodSelector
                title="Como você se sente DEPOIS de comer?"
                selectedMood={moodAfter}
                onMoodChange={setMoodAfter}
                notes={notes}
                onNotesChange={setNotes}
                showNotes={true}
              />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMoodMutation.isPending || (!moodBefore && !moodAfter)}
            className="w-full sm:w-auto"
          >
            {saveMoodMutation.isPending ? "Salvando..." : "Salvar Humor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}