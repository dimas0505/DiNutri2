import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface MealSubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  foodName: string;
  substitutes: string[];
}

export default function MealSubstitutionModal({
  isOpen,
  onClose,
  foodName,
  substitutes,
}: MealSubstitutionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Opções de Substituição
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 text-left">
            Para: {foodName}
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="p-4 pt-2">
          {substitutes && substitutes.length > 0 ? (
            <div className="space-y-2">
              {substitutes.map((substitute, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200"
                >
                  <p className="text-sm text-gray-700">• {substitute}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Nenhuma opção de substituição disponível</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pt-0">
          <Button 
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}