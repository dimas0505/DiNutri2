import { useState } from "react";
import { ArrowLeft, Camera, Heart, Image, UtensilsCrossed, Repeat } from "lucide-react";
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
  onClose: onBack,
}: MealMenuScreenProps) {
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MealItemData | null>(null);
  const { toast } = useToast();

  const handlePhotoAction = () => {
    setShowPhotoModal(true);
  };

  const handleMoodAction = () => {
    setShowMoodModal(true);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-4 font-sans">
        {/* Cabeçalho Melhorado */}
        <header className="flex items-center mb-8">
          <Button onClick={onBack} variant="ghost" size="icon" className="mr-2 rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-green-600 to-teal-500 bg-clip-text text-transparent">
              {meal.name}
            </h1>
          </div>
        </header>

        {/* Menu da refeição */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Menu da refeição</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Foto para o diário alimentar */}
            <Button
              onClick={handlePhotoAction}
              className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
            >
              <Camera className="h-6 w-6" />
              <span className="text-xs font-medium text-center">
                Foto para o diário alimentar
              </span>
            </Button>

            {/* Registrar humor na refeição */}
            <Button
              onClick={handleMoodAction}
              className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
            >
              <Heart className="h-6 w-6" />
              <span className="text-xs font-medium text-center">
                Registrar humor na refeição
              </span>
            </Button>
          </div>
        </div>

        {/* Lista de Alimentos em Cards */}
        <div className="space-y-4">
          {meal.items.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start flex-1 min-w-0">
                    <div className="bg-green-100 p-3 rounded-full mr-4 flex-shrink-0">
                      <UtensilsCrossed className="h-6 w-6 text-green-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold text-gray-800 leading-tight break-words">{item.description}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.amount}</p>
                    </div>
                  </div>

                  {item.substitutes && item.substitutes.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-colors duration-300 flex-shrink-0 whitespace-nowrap"
                      onClick={() => setSelectedItem(item)}
                    >
                      <Repeat className="mr-1 h-3 w-3" />
                      Substituir
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Observações da refeição */}
        {meal.notes && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <Image className="h-4 w-4 mr-2 text-blue-600" />
              Observações
            </h3>
            <p className="text-sm text-gray-700">{meal.notes}</p>
          </div>
        )}
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
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        foodName={selectedItem?.description || ""}
        substitutes={selectedItem?.substitutes || []}
      />

      <FoodPhotoModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        meal={meal}
        prescriptionId={prescriptionId}
      />
    </>
  );
}