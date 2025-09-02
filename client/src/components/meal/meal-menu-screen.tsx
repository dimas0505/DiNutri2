import { useState } from "react";
import { X, Camera, Heart, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import MoodRegistrationModal from "@/components/mood/mood-registration-modal";
import MealSubstitutionModal from "@/components/meal/meal-substitution-modal";
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
  const [selectedItemForSubstitution, setSelectedItemForSubstitution] = useState<MealItemData | null>(null);
  const { toast } = useToast();

  const handlePhotoAction = () => {
    toast({
      title: "Foto para o diário",
      description: "Funcionalidade em desenvolvimento",
    });
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
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{meal.name}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Menu da refeição */}
        <div>
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

        {/* Lista de Alimentos */}
        <div>
          <h2 className="text-lg font-medium text-gray-800 mb-4">Alimentos desta refeição</h2>
          <div className="space-y-3">
            {meal.items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {item.description}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {item.amount}
                    </p>
                    
                    {/* Botão de substituição */}
                    <Button
                      onClick={() => handleSubstitutionClick(item)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200"
                    >
                      Ver opções de substituição
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observações da refeição */}
        {meal.notes && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
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
        isOpen={showSubstitutionModal}
        onClose={handleSubstitutionModalClose}
        foodName={selectedItemForSubstitution?.description || ""}
        substitutes={selectedItemForSubstitution?.substitutes || []}
      />
    </div>
  );
}