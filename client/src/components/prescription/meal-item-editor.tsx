import { useState } from "react";
import { GripVertical, X, ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MealItemData } from "@shared/schema";

interface MealItemEditorProps {
  item: MealItemData;
  onUpdate: (item: MealItemData) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function MealItemEditor({ item, onUpdate, onDelete, onMoveUp, onMoveDown }: MealItemEditorProps) {
  const [isSubstitutesOpen, setIsSubstitutesOpen] = useState(!!item.substitutes && item.substitutes.length > 0);
  const [newSubstitute, setNewSubstitute] = useState("");

  const updateDescription = (description: string) => {
    onUpdate({ ...item, description });
  };

  const updateAmount = (amount: string) => {
    onUpdate({ ...item, amount });
  };

  const addSubstitute = () => {
    if (newSubstitute.trim()) {
      const substitutes = item.substitutes || [];
      onUpdate({ 
        ...item, 
        substitutes: [...substitutes, newSubstitute.trim()] 
      });
      setNewSubstitute("");
    }
  };

  const removeSubstitute = (index: number) => {
    const substitutes = item.substitutes || [];
    const updatedSubstitutes = substitutes.filter((_, i) => i !== index);
    onUpdate({ 
      ...item, 
      substitutes: updatedSubstitutes.length > 0 ? updatedSubstitutes : undefined 
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubstitute();
    }
  };

  return (
    <div className="bg-background border border-border rounded-md p-3 space-y-3">
      {/* Linha principal do item */}
      <div className="flex items-center space-x-3">
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

      {/* Seção de substitutos */}
      <Collapsible open={isSubstitutesOpen} onOpenChange={setIsSubstitutesOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
            >
              <Plus className="h-3 w-3 mr-1" />
              {item.substitutes && item.substitutes.length > 0 
                ? `${item.substitutes.length} substituto(s)`
                : "Adicionar substitutos"
              }
            </Button>
          </CollapsibleTrigger>
          
          {/* Badges dos substitutos (visíveis quando recolhido) */}
          {!isSubstitutesOpen && item.substitutes && item.substitutes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.substitutes.slice(0, 3).map((substitute, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {substitute}
                </Badge>
              ))}
              {item.substitutes.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.substitutes.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        <CollapsibleContent className="space-y-2 mt-2">
          {/* Lista de substitutos editáveis */}
          {item.substitutes && item.substitutes.length > 0 && (
            <div className="space-y-1">
              {item.substitutes.map((substitute, index) => (
                <div key={index} className="flex items-center space-x-2 bg-muted/30 rounded p-2">
                  <span className="text-sm flex-1">{substitute}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSubstitute(index)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Input para adicionar novo substituto */}
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Ex: Pão integral, Tapioca..."
              className="text-sm"
              value={newSubstitute}
              onChange={(e) => setNewSubstitute(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSubstitute}
              disabled={!newSubstitute.trim()}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}