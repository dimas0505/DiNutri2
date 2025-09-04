import { useState, useEffect } from "react";
import { Info, ChevronDown, ChevronUp, Heart, MessageSquare, Camera, Maximize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import MoodRegistrationModal from "@/components/mood/mood-registration-modal";
import FoodPhotoModal from "@/components/diary/food-photo-modal";
import MealMenuScreen from "@/components/meal/meal-menu-screen";
import type { MealData } from "@shared/schema";

interface MealViewerProps {
  meal: MealData;
  prescriptionId?: string;
  patientId?: string;
  autoExpand?: boolean; // Nova prop
}

interface MoodEntry {
  id: string;
  moodBefore?: string;
  moodAfter?: string;
  notes?: string;
  date: string;
}

// Função para fazer requisições API (temporária, até implementarmos a API completa)
async function apiRequest(method: string, url: string, data?: any) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

export default function MealViewer({ meal, prescriptionId, patientId, autoExpand = false }: MealViewerProps) {
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showFullScreenMenu, setShowFullScreenMenu] = useState(false);
  const [showSubstitutes, setShowSubstitutes] = useState<{ [key: string]: boolean }>({});

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (autoExpand) {
      setIsExpanded(true);
    }
  }, [autoExpand]);

  const { data: moodEntry } = useQuery<MoodEntry>({
    queryKey: ["/api/mood-entries", prescriptionId, meal.id, today],
    queryFn: async () => {
      if (!prescriptionId) return null;
      try {
        return await apiRequest("GET", `/api/mood-entries/${prescriptionId}/${meal.id}/${today}`);
      } catch (error) {
        return null;
      }
    },
    enabled: !!prescriptionId,
  });

  const handlePhotoAction = () => {
    setShowPhotoModal(true);
  };

  const handleMoodRegistration = () => {
    setShowMoodModal(true);
  };

  const toggleSubstitutes = (itemId: string) => {
    setShowSubstitutes(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  return (
    <>
      <Card>
        <CardHeader 
          className={`pb-4 bg-accent/5 transition-colors ${
            !autoExpand ? 'cursor-pointer hover:bg-accent/10' : ''
          }`}
          onClick={!autoExpand ? () => setIsExpanded(!isExpanded) : undefined}
        >
          <div className="flex items-center justify-between">
            <CardTitle data-testid={`text-meal-name-${meal.id}`}>
              {meal.name}
            </CardTitle>
            <div className="flex items-center space-x-2">
              {moodEntry && (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <span>Registrado</span>
                </div>
              )}
              {!autoExpand && (
                isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          {isExpanded && (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Menu da refeição</h4>
                  <Button
                    onClick={() => setShowFullScreenMenu(true)}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Maximize2 className="h-4 w-4 mr-1" />
                    Tela Completa
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Button
                    onClick={handlePhotoAction}
                    className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg"
                  >
                    <Camera className="h-6 w-6" />
                    <div className="text-xs text-center leading-tight">
                      <div>Foto para o</div>
                      <div>diário alimentar</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={handleMoodRegistration}
                    className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg"
                  >
                    <Heart className="h-6 w-6" />
                    <div className="text-xs text-center leading-tight">
                      <div>Registrar humor</div>
                      <div>na refeição</div>
                    </div>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Alimentos</h4>
                
                {meal.items.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900" data-testid={`text-item-description-${item.id}`}>
                            {item.description}
                          </div>
                          <div className="text-sm text-muted-foreground" data-testid={`text-item-amount-${item.id}`}>
                            {item.amount}
                          </div>
                        </div>
                      </div>
                      
                      {item.substitutes && item.substitutes.length > 0 && (
                        <div className="ml-4">
                          <button
                            onClick={() => toggleSubstitutes(item.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                          >
                            <span>↪</span>
                            <span>Ver opções de substituição</span>
                          </button>
                          
                          {showSubstitutes[item.id] && (
                            <div className="mt-2 ml-4 space-y-1">
                              {item.substitutes.map((substitute, index) => (
                                <div key={index} className="text-sm text-gray-600">
                                  • {substitute}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {meal.notes && (
                <div className="mt-6 bg-muted/30 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground flex items-start space-x-2" data-testid={`text-meal-notes-${meal.id}`}>
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{meal.notes}</span>
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {prescriptionId && (
        <MoodRegistrationModal
          isOpen={showMoodModal}
          onClose={() => setShowMoodModal(false)}
          meal={meal}
          prescriptionId={prescriptionId}
          patientId={patientId || ""}
        />
      )}
      
      {prescriptionId && (
        <FoodPhotoModal
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          meal={meal}
          prescriptionId={prescriptionId}
        />
      )}

      {showFullScreenMenu && prescriptionId && (
        <MealMenuScreen
          meal={meal}
          prescriptionId={prescriptionId}
          patientId={patientId || ""}
          onClose={() => setShowFullScreenMenu(false)}
        />
      )}
    </>
  );
}