import { useState } from "react";
import { X, Camera, Heart, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      {/* Enhanced Header with gradient and better typography */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-xl">
        <div className="p-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-xl"
              >
                <X className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-xl font-bold leading-tight">{meal.name}</h1>
                <p className="text-purple-100 text-sm">
                  {meal.items.length} {meal.items.length === 1 ? 'alimento' : 'alimentos'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Content with better spacing and organization */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-8">
          {/* Quick Actions Grid - now more prominent */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Photo for diary */}
              <Button
                onClick={handlePhotoAction}
                className="h-24 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                <Camera className="h-7 w-7" />
                <span className="text-xs font-medium text-center leading-tight">
                  Foto para<br />o diário
                </span>
              </Button>

              {/* Mood registration */}
              <Button
                onClick={handleMoodAction}
                className="h-24 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-xl shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                <Heart className="h-7 w-7" />
                <span className="text-xs font-medium text-center leading-tight">
                  Registrar<br />humor
                </span>
              </Button>
            </div>
          </div>

          {/* Enhanced Food Items List */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              Alimentos desta Refeição
            </h2>
            <div className="space-y-4">
              {meal.items.map((item, index) => (
                <div
                  key={item.id}
                  className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    {/* Item number badge */}
                    <div className="bg-orange-100 text-orange-700 text-sm font-bold rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-2 text-base leading-tight">
                        {item.description}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 bg-gray-100 px-3 py-1.5 rounded-lg inline-block">
                        📏 {item.amount}
                      </p>
                      
                      {/* Enhanced substitution button */}
                      <Button
                        onClick={() => handleSubstitutionClick(item)}
                        variant="outline"
                        size="sm"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 rounded-lg font-medium"
                      >
                        <span className="mr-2">🔄</span>
                        Ver opções de substituição
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Notes Section */}
          {meal.notes && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <div className="bg-blue-500 text-white p-1.5 rounded-lg">
                  <Image className="h-4 w-4" />
                </div>
                Observações Importantes
              </h3>
              <p className="text-blue-800 text-sm leading-relaxed bg-white/50 p-4 rounded-xl">
                {meal.notes}
              </p>
            </div>
          )}
          
          {/* Bottom spacing for better mobile experience */}
          <div className="h-8"></div>
        </div>
      </div>

      {/* Modals remain the same */}
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