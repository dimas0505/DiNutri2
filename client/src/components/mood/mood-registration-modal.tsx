import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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

const moodOptions = [
  { value: "very_sad" as MoodType, emoji: "😢" },
  { value: "sad" as MoodType, emoji: "😔" },
  { value: "neutral" as MoodType, emoji: "😐" },
  { value: "happy" as MoodType, emoji: "😊" },
  { value: "very_happy" as MoodType, emoji: "😍" },
];

function MoodRegistrationModal({
  isOpen,
  onClose,
  meal,
  prescriptionId,
  patientId,
}: MoodRegistrationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [moodBefore, setMoodBefore] = useState<MoodType | undefined>();
  const [moodAfter, setMoodAfter] = useState<MoodType | undefined>();

  const today = new Date().toISOString().split('T')[0];

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
    } else {
      setMoodBefore(undefined);
      setMoodAfter(undefined);
    }
  }, [existingMoodEntry]);

  const saveMoodMutation = useMutation({
    mutationFn: async (data: {
      moodBefore?: MoodType;
      moodAfter?: MoodType;
    }) => {
      const payload = {
        patientId,
        prescriptionId,
        mealId: meal.id,
        date: today,
        ...data,
      };

      if (existingMoodEntry?.id) {
        return await apiRequest("PUT", `/api/mood-entries/${existingMoodEntry.id}`, payload);
      } else {
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
    });
  };

  const handleClose = () => {
    onClose();
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
      <DialogContent className="sm:max-w-sm p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {meal.name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Menu da refeição</p>
        </DialogHeader>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Humor antes da refeição */}
          <div className="bg-white p-4 rounded-lg space-y-4">
            <h3 className="text-center text-sm font-medium">
              Seu humor ANTES da refeição?
            </h3>
            <div className="flex justify-center space-x-2">
              {moodOptions.map((option) => (
                <button
                  key={`before-${option.value}`}
                  onClick={() => setMoodBefore(option.value)}
                  className={`w-12 h-12 text-2xl rounded-full transition-all ${
                    moodBefore === option.value
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Humor após a refeição */}
          <div className="bg-white p-4 rounded-lg space-y-4">
            <h3 className="text-center text-sm font-medium">
              Seu humor APÓS a refeição?
            </h3>
            <div className="flex justify-center space-x-2">
              {moodOptions.map((option) => (
                <button
                  key={`after-${option.value}`}
                  onClick={() => setMoodAfter(option.value)}
                  className={`w-12 h-12 text-2xl rounded-full transition-all ${
                    moodAfter === option.value
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Botão Avançar */}
          <Button 
            onClick={handleSave}
            disabled={saveMoodMutation.isPending || (!moodBefore && !moodAfter)}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
          >
            {saveMoodMutation.isPending ? "Salvando..." : "Avançar >>"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MoodRegistrationModal;