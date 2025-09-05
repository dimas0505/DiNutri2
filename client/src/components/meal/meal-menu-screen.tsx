import { useState } from "react";
import { X, Camera, Heart, Image, ArrowLeft, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import MoodRegistrationModal from "@/components/mood/mood-registration-modal";
import MealSubstitutionModal from "@/components/meal/meal-substitution-modal";
import FoodPhotoModal from "@/components/diary/food-photo-modal";
import type { MealData, MealItemData } from "@shared/schema";

interface MealMenuScreenProps {
  meal: MealData;
  prescriptionId: string;
  patientId: string;
  onClose: () => void;
}

export default function MealMenuScreen({
  meal,
  prescriptionId,
  patientId,
  onClose,
}: MealMenuScreenProps) {
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedItemForSubstitution, setSelectedItemForSubstitution] = useState<MealItemData | null>(null);
  const { toast } = useToast();

  const handlePhotoAction = () => {
    setShowPhotoModal(true);
  };

  const handleMoodAction = () => {
    setShowMoodModal(true);
  };

  const handleSubstitutionClick = (item: MealItemData) => {
    setSelectedItemForSubstitution(item);
    setShowSubstitutionModal(true);
  };

  const handleSubstitutionModalClose = () => {
    setShowSubstitutionModal(false);
    setSelectedItemForSubstitution(null);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Enhanced Header with gradient */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-full"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">{meal.name}</h1>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <Utensils className="h-4 w-4" />
            <span className="text-sm opacity-90">
              {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'} nesta refeição
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
          {/* Enhanced Quick Actions Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Ações Rápidas</h2>
              <p className="text-sm text-gray-600">Registre sua experiência com esta refeição</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo Action - Emerald theme */}
              <Button
                onClick={handlePhotoAction}
                className="h-24 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Camera className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">Adicionar Foto</div>
                  <div className="text-xs opacity-90">Registre no diário alimentar</div>
                </div>
              </Button>

              {/* Mood Action - Rose theme */}
              <Button
                onClick={handleMoodAction}
                className="h-24 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Heart className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">Registrar Humor</div>
                  <div className="text-xs opacity-90">Como você se sente?</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Enhanced Food Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Alimentos desta Refeição</h2>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'}
              </Badge>
            </div>
            
            <div className="grid gap-4">
              {meal.items.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300"
                >
                  <div className="flex items-start space-x-4">
                    {/* Numbered badge */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                        {index + 1}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                        {item.description}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">
                        <span className="font-medium">Quantidade:</span> {item.amount}
                      </p>
                      
                      {/* Enhanced substitution button */}
                      <Button
                        onClick={() => handleSubstitutionClick(item)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 rounded-lg font-medium"
                      >
                        <span>Ver opções de substituição</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Notes Section */}
          {meal.notes && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Image className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-2 text-lg">
                    Observações Importantes
                  </h3>
                  <p className="text-amber-800 leading-relaxed">{meal.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MoodRegistrationModal
        isOpen={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        meal={meal}
        prescriptionId={prescriptionId}
        patientId={patientId}
      />

      <MealSubstitutionModal
        isOpen={showSubstitutionModal}
        onClose={handleSubstitutionModalClose}
        foodName={selectedItemForSubstitution?.description || ""}
        substitutes={selectedItemForSubstitution?.substitutes || []}
      />

      <FoodPhotoModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        meal={meal}
        prescriptionId={prescriptionId}
      />
    </div>
  );
}