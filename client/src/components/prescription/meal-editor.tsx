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
    <Card>
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="cursor-move text-muted-foreground">
              <GripVertical className="h-5 w-5" />
            </div>
            <Input
              className="text-lg font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1"
              value={meal.name}
              onChange={(e) => updateMealName(e.target.value)}
              placeholder="Nome da refeição"
              data-testid={`input-meal-name-${meal.id}`}
            />
            <div className="flex space-x-1">
              {onMoveUp && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMoveUp}
                  title="Mover para cima"
                  data-testid={`button-move-meal-up-${meal.id}`}
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
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive/80"
            data-testid={`button-delete-meal-${meal.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Meal Items */}
        <div className="space-y-3 mb-4">
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

        <Button
          variant="outline"
          onClick={addItem}
          className="w-full mb-4 flex items-center justify-center space-x-2"
          data-testid={`button-add-item-${meal.id}`}
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar Item</span>
        </Button>

        <div>
          <label className="block text-sm font-medium mb-2">Observações da Refeição</label>
          <Textarea
            className="h-20"
            placeholder="Observações específicas desta refeição..."
            value={meal.notes || ""}
            onChange={(e) => updateMealNotes(e.target.value)}
            data-testid={`textarea-meal-notes-${meal.id}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
