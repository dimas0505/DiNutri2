import { useState } from "react";
import { GripVertical, Trash2, Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import MealItemEditor from "./meal-item-editor";
import type { MealData, MealItemData } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';

interface MealEditorProps {
  meal: MealData;
  onUpdate: (meal: MealData) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function MealEditor({ meal, onUpdate, onDelete, onMoveUp, onMoveDown }: MealEditorProps) {
  const updateMealName = (name: string) => {
    onUpdate({ ...meal, name });
  };

  const updateMealNotes = (notes: string) => {
    onUpdate({ ...meal, notes });
  };

  const addItem = () => {
    const newItem: MealItemData = {
      id: uuidv4(),
      description: "",
      amount: "",
    };
    onUpdate({ ...meal, items: [...meal.items, newItem] });
  };

  const updateItem = (itemId: string, updatedItem: MealItemData) => {
    const updatedItems = meal.items.map(item => 
      item.id === itemId ? updatedItem : item
    );
    onUpdate({ ...meal, items: updatedItems });
  };

  const deleteItem = (itemId: string) => {
    const updatedItems = meal.items.filter(item => item.id !== itemId);
    onUpdate({ ...meal, items: updatedItems });
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...meal.items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    onUpdate({ ...meal, items: newItems });
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-card via-card to-card/95">
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="cursor-move text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/20">
              <GripVertical className="h-5 w-5" />
            </div>
            <Input
              className="text-xl font-semibold bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:bg-background/20 rounded-lg px-3 py-2 min-w-[200px]"
              value={meal.name}
              onChange={(e) => updateMealName(e.target.value)}
              placeholder="Nome da refeição"
              data-testid={`input-meal-name-${meal.id}`}
            />
          </div>
          <div className="flex space-x-2">
            {onMoveUp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveUp}
                title="Mover para cima"
                data-testid={`button-move-meal-up-${meal.id}`}
                className="hover:bg-background/20"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {onMoveDown && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveDown}
                title="Mover para baixo"
                data-testid={`button-move-meal-down-${meal.id}`}
                className="hover:bg-background/20"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              title="Excluir refeição"
              data-testid={`button-delete-meal-${meal.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Lista de itens */}
        <div className="space-y-4">
          {meal.items.map((item, index) => (
            <MealItemEditor
              key={item.id}
              item={item}
              onUpdate={(updatedItem) => updateItem(item.id, updatedItem)}
              onDelete={() => deleteItem(item.id)}
              onMoveUp={index > 0 ? () => moveItem(index, index - 1) : undefined}
              onMoveDown={index < meal.items.length - 1 ? () => moveItem(index, index + 1) : undefined}
            />
          ))}
        </div>

        {/* Botão para adicionar item */}
        <Button
          variant="outline"
          size="lg"
          onClick={addItem}
          className="w-full border-dashed border-2 h-12 hover:bg-muted/20 hover:border-primary/30"
          data-testid={`button-add-item-${meal.id}`}
        >
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Item
        </Button>

        {/* Observações da refeição */}
        <div className="space-y-3 pt-4 border-t border-border/30">
          <label className="text-sm font-semibold text-muted-foreground">
            Observações da Refeição
          </label>
          <Textarea
            placeholder="Observações específicas desta refeição..."
            value={meal.notes || ""}
            onChange={(e) => updateMealNotes(e.target.value)}
            className="min-h-[100px] bg-muted/10 border-2 focus-visible:ring-2 focus-visible:ring-ring/20"
            data-testid={`textarea-meal-notes-${meal.id}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}