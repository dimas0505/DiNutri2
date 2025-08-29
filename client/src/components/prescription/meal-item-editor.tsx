import { GripVertical, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MealItemData } from "@shared/schema";

interface MealItemEditorProps {
  item: MealItemData;
  onUpdate: (item: MealItemData) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function MealItemEditor({ item, onUpdate, onDelete, onMoveUp, onMoveDown }: MealItemEditorProps) {
  const updateDescription = (description: string) => {
    onUpdate({ ...item, description });
  };

  const updateAmount = (amount: string) => {
    onUpdate({ ...item, amount });
  };

  return (
    <div className="flex items-center space-x-3 bg-background border border-border rounded-md p-3">
      <div className="cursor-move text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          type="text"
          placeholder="Ex: Pão francês"
          className="text-sm"
          value={item.description}
          onChange={(e) => updateDescription(e.target.value)}
          data-testid={`input-item-description-${item.id}`}
        />
        <Input
          type="text"
          placeholder="Ex: 1 unidade (50g)"
          className="text-sm"
          value={item.amount}
          onChange={(e) => updateAmount(e.target.value)}
          data-testid={`input-item-amount-${item.id}`}
        />
      </div>
      <div className="flex space-x-1">
        {onMoveUp && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveUp}
            title="Mover para cima"
            data-testid={`button-move-item-up-${item.id}`}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
        )}
        {onMoveDown && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            title="Mover para baixo"
            data-testid={`button-move-item-down-${item.id}`}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive/80"
          data-testid={`button-delete-item-${item.id}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
