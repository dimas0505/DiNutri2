import { useState, useEffect } from "react";
import { Info, ChevronDown, ChevronUp, Heart, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MealData } from "@shared/schema";

interface MealViewerProps {
  meal: MealData;
  prescriptionId?: string;
}

interface MoodEntry {
  id: string;
  moodBefore?: string;
  moodAfter?: string;
  notes?: string;
  date: string;
}

const moodOptions = [
  { value: 'very_sad', label: '😢', description: 'Muito triste' },
  { value: 'sad', label: '😟', description: 'Triste' },
  { value: 'neutral', label: '😐', description: 'Neutro' },
  { value: 'happy', label: '😊', description: 'Feliz' },
  { value: 'very_happy', label: '😄', description: 'Muito feliz' }
];

export default function MealViewer({ meal, prescriptionId }: MealViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [moodBefore, setMoodBefore] = useState<string>('');
  const [moodAfter, setMoodAfter] = useState<string>('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];

  // Buscar entrada de humor do dia atual para esta refeição
  const { data: moodEntry, isLoading } = useQuery<MoodEntry>({
    queryKey: ["/api/mood-entries", prescriptionId, meal.id, today],
    enabled: isExpanded && !!prescriptionId,
  });

  // Atualizar estado local quando carregar dados
  useEffect(() => {
    if (moodEntry) {
      setMoodBefore(moodEntry.moodBefore || '');
      setMoodAfter(moodEntry.moodAfter || '');
      setNotes(moodEntry.notes || '');
    }
  }, [moodEntry]);

  const saveMoodMutation = useMutation({
    mutationFn: async (data: { moodBefore?: string; moodAfter?: string; notes?: string }) => {
      if (!prescriptionId) throw new Error('Prescription ID is required');
      
      if (moodEntry?.id) {
        // Atualizar entrada existente
        const response = await apiRequest("PUT", `/api/mood-entries/${moodEntry.id}`, data);
        return await response.json();
      } else {
        // Criar nova entrada
        const response = await apiRequest("POST", "/api/mood-entries", {
          prescriptionId,
          mealId: meal.id,
          date: today,
          ...data
        });
        return await response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Humor registrado com sucesso!",
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/mood-entries", prescriptionId, meal.id, today] 
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao registrar humor.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMoodMutation.mutate({
      moodBefore: moodBefore || undefined,
      moodAfter: moodAfter || undefined,
      notes: notes || undefined
    });
  };

  const getMoodLabel = (moodValue: string) => {
    const mood = moodOptions.find(option => option.value === moodValue);
    return mood ? `${mood.label} ${mood.description}` : '';
  };

  return (
    <Card>
      <CardHeader 
        className="pb-4 bg-accent/5 cursor-pointer hover:bg-accent/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle data-testid={`text-meal-name-${meal.id}`}>
            {meal.name}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {/* Indicador se já tem registro de humor hoje */}
            {moodEntry && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Heart className="h-4 w-4 text-pink-500" />
                <span>Registrado</span>
              </div>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Itens da refeição */}
        <div className="grid gap-3 mb-4">
          {meal.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-background border border-border rounded-md p-3">
              <div className="flex-1">
                <span className="font-medium" data-testid={`text-item-description-${item.id}`}>
                  {item.description}
                </span>
              </div>
              <div className="text-muted-foreground" data-testid={`text-item-amount-${item.id}`}>
                {item.amount}
              </div>
            </div>
          ))}
        </div>

        {/* Notas da refeição */}
        {meal.notes && (
          <div className="bg-muted/30 p-3 rounded-md mb-4">
            <p className="text-sm text-muted-foreground flex items-start space-x-2" data-testid={`text-meal-notes-${meal.id}`}>
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{meal.notes}</span>
            </p>
          </div>
        )}

        {/* Seção de tracking de humor (expandida) - apenas se tiver prescriptionId */}
        {isExpanded && prescriptionId && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Heart className="h-5 w-5 text-pink-500" />
              <h4 className="font-medium">Como você se sente hoje?</h4>
            </div>

            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : (
              <>
                {/* Humor antes da refeição */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Antes da refeição:</label>
                  <div className="flex flex-wrap gap-2">
                    {moodOptions.map((option) => (
                      <Button
                        key={`before-${option.value}`}
                        variant={moodBefore === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMoodBefore(option.value)}
                        className="flex items-center space-x-1"
                      >
                        <span>{option.label}</span>
                        <span className="text-xs">{option.description}</span>
                      </Button>
                    ))}
                  </div>
                  {moodBefore && (
                    <p className="text-xs text-muted-foreground">
                      Selecionado: {getMoodLabel(moodBefore)}
                    </p>
                  )}
                </div>

                {/* Humor após a refeição */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Após a refeição:</label>
                  <div className="flex flex-wrap gap-2">
                    {moodOptions.map((option) => (
                      <Button
                        key={`after-${option.value}`}
                        variant={moodAfter === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMoodAfter(option.value)}
                        className="flex items-center space-x-1"
                      >
                        <span>{option.label}</span>
                        <span className="text-xs">{option.description}</span>
                      </Button>
                    ))}
                  </div>
                  {moodAfter && (
                    <p className="text-xs text-muted-foreground">
                      Selecionado: {getMoodLabel(moodAfter)}
                    </p>
                  )}
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center space-x-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>Observações (opcional):</span>
                  </label>
                  <Textarea
                    placeholder="Como foi a refeição? Alguma observação especial..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-20"
                  />
                </div>

                {/* Botão salvar */}
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSave}
                    disabled={saveMoodMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <Heart className="h-4 w-4" />
                    <span>
                      {saveMoodMutation.isPending ? 'Salvando...' : 'Salvar Registro'}
                    </span>
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}