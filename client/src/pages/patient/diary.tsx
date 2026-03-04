import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useInvalidatePatientData } from "@/hooks/useInvalidatePatientData";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  Smile, 
  Trash2, 
  Calendar as CalendarIcon, 
  Utensils,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  Image as ImageIcon
} from "lucide-react";
import { format, addDays, subDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FoodDiaryEntryWithPrescription, Patient } from "@shared/schema";
import { cn } from "@/lib/utils";

const moodOptions = [
  { value: "very_sad", emoji: "😢", label: "Muito Triste" },
  { value: "sad", emoji: "😔", label: "Triste" },
  { value: "neutral", emoji: "😐", label: "Neutro" },
  { value: "happy", emoji: "😊", label: "Feliz" },
  { value: "very_happy", emoji: "😍", label: "Muito Feliz" },
];

export default function PatientDiaryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const invalidatePatientData = useInvalidatePatientData();

  // Invalida o cache ao montar a tela para garantir dados frescos
  useEffect(() => {
    invalidatePatientData();
  }, [invalidatePatientData]);

  const { data: patient } = useQuery<Patient>({
    queryKey: ["/api/patient/my-profile"],
  });

  const { data: diaryEntries, isLoading } = useQuery<FoodDiaryEntryWithPrescription[]>({
    queryKey: ["/api/patients", patient?.id, "food-diary", "entries"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/patients/${patient?.id}/food-diary/entries`);
      return res.json();
    },
    enabled: !!patient?.id,
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      // O endpoint de delete no server parece esperar o ID da entrada e remove a foto do blob
      await apiRequest("DELETE", `/api/food-diary/entries/${entryId}/photo`);
    },
    onSuccess: () => {
      toast({ title: "Registro removido", description: "A entrada do diário foi excluída com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patient?.id, "food-diary", "entries"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir o registro.", variant: "destructive" });
    }
  });

  const getMoodInfo = (value?: string) => {
    return moodOptions.find(opt => opt.value === value);
  };

  const filteredEntries = diaryEntries?.filter(entry => {
    if (!entry.date) return false;
    return isSameDay(parseISO(entry.date), selectedDate);
  }) || [];

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleToday = () => setSelectedDate(new Date());

  return (
    <MobileLayout title="Meu Diário" showBackButton>
      <div className="min-h-screen bg-[#F0F1F7] pb-24">
        {/* Seletor de Data */}
        <div className="bg-white px-4 py-4 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="text-purple-600">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <div className="text-center flex flex-col items-center" onClick={handleToday}>
              <div className="flex items-center gap-2 text-purple-700 font-bold">
                <CalendarIcon className="h-4 w-4" />
                <span className="capitalize">
                  {isSameDay(selectedDate, new Date()) ? "Hoje" : format(selectedDate, "EEEE", { locale: ptBR })}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>

            <Button variant="ghost" size="icon" onClick={handleNextDay} className="text-purple-600">
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-500 font-medium">Carregando seu diário...</p>
            </div>
          ) : filteredEntries.length > 0 ? (
            <div className="space-y-6">
              {filteredEntries.map((entry) => {
                // No storage.ts, o campo é retornado como prescriptionMeals e processado no front
                const meals = (entry as any).prescriptionMeals as any[] | undefined;
                const meal = meals?.find(m => m.id === entry.mealId);
                const mealName = meal?.name || "Refeição";
                const moodBefore = getMoodInfo(entry.moodBefore);
                const moodAfter = getMoodInfo(entry.moodAfter);

                return (
                  <Card key={entry.id} className="overflow-hidden border-none shadow-md rounded-2xl bg-white">
                    {entry.imageUrl && (
                      <div className="relative aspect-square sm:aspect-video overflow-hidden group">
                        <img 
                          src={entry.imageUrl} 
                          alt={mealName} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-black/40 backdrop-blur-md text-white border-none px-3 py-1">
                            {mealName}
                          </Badge>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-3 right-3 h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          onClick={() => deleteEntryMutation.mutate(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {!entry.imageUrl && (
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <Utensils className="h-5 w-5 text-purple-600" />
                            </div>
                          )}
                          <div>
                            {!entry.imageUrl && <h3 className="font-bold text-gray-900">{mealName}</h3>}
                            <div className="flex items-center text-xs text-gray-400 mt-0.5">
                              <Clock className="h-3 w-3 mr-1" />
                              {entry.createdAt ? format(new Date(entry.createdAt), "HH:mm", { locale: ptBR }) : "--:--"}
                            </div>
                          </div>
                        </div>
                        
                        {!entry.imageUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-300 hover:text-red-500"
                            onClick={() => deleteEntryMutation.mutate(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Seção de Humor */}
                      {(entry.moodBefore || entry.moodAfter) && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {entry.moodBefore && (
                            <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/50">
                              <p className="text-[10px] uppercase tracking-wider text-blue-500 font-bold mb-1">Antes</p>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{moodBefore?.emoji}</span>
                                <span className="text-xs font-medium text-blue-700">{moodBefore?.label}</span>
                              </div>
                            </div>
                          )}
                          {entry.moodAfter && (
                            <div className="bg-purple-50/50 rounded-xl p-3 border border-purple-100/50">
                              <p className="text-[10px] uppercase tracking-wider text-purple-500 font-bold mb-1">Depois</p>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{moodAfter?.emoji}</span>
                                <span className="text-xs font-medium text-purple-700">{moodAfter?.label}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Observações */}
                      {(entry.notes || entry.moodNotes) && (
                        <div className="bg-gray-50 rounded-xl p-4 relative">
                          <MessageSquare className="h-4 w-4 text-gray-300 absolute top-3 right-3" />
                          <p className="text-sm text-gray-600 leading-relaxed pr-6">
                            {entry.notes || entry.moodNotes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                <ImageIcon className="h-10 w-10 text-purple-200" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum registro hoje</h3>
              <p className="text-gray-500 text-sm max-w-[240px] leading-relaxed">
                Você ainda não registrou fotos ou humor para suas refeições neste dia.
              </p>
              <Button 
                onClick={() => window.location.href = "/patient/prescription"}
                className="mt-8 bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8"
              >
                Ir para o Plano
              </Button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
