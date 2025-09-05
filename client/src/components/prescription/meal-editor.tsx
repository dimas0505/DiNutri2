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
    <Card className="shadow-xl border-2 border-rose-100 dark:border-rose-900/30 bg-gradient-to-br from-rose-50 via-card to-pink-50 dark:from-rose-950/20 dark:via-card dark:to-pink-950/20">
      <div className="p-4 sm:p-6 border-b border-rose-200 dark:border-rose-800 bg-gradient-to-r from-rose-100/50 via-rose-50/30 to-pink-100/50 dark:from-rose-900/30 dark:via-rose-950/20 dark:to-pink-900/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="cursor-move text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/30 shadow-sm">
              <GripVertical className="h-5 w-5" />
            </div>
            <Input
              className="text-lg sm:text-xl font-semibold bg-background/80 border-2 border-rose-200 dark:border-rose-800 outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:border-rose-400 dark:focus-visible:ring-rose-700 dark:focus-visible:border-rose-600 rounded-lg px-4 py-3 min-w-0 flex-1 shadow-sm"
              value={meal.name}
              onChange={(e) => updateMealName(e.target.value)}
              placeholder="Nome da refeição"
              data-testid={`input-meal-name-${meal.id}`}
            />
          </div>
          <div className="flex space-x-2 w-full sm:w-auto justify-end">
            {onMoveUp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveUp}
                title="Mover para cima"
                data-testid={`button-move-meal-up-${meal.id}`}
                className="hover:bg-rose-100 dark:hover:bg-rose-900/30 shadow-sm border border-rose-200 dark:border-rose-800"
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
                className="hover:bg-rose-100 dark:hover:bg-rose-900/30 shadow-sm border border-rose-200 dark:border-rose-800"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive/80 hover:bg-destructive/20 shadow-sm border border-destructive/30"
              title="Excluir refeição"
              data-testid={`button-delete-meal-${meal.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4 sm:p-6 space-y-6">
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
          className="w-full border-dashed border-3 border-rose-300 dark:border-rose-700 h-14 hover:bg-rose-50 hover:border-rose-400 dark:hover:bg-rose-950/30 dark:hover:border-rose-600 text-rose-700 dark:text-rose-300 shadow-md"
          data-testid={`button-add-item-${meal.id}`}
        >
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Item
        </Button>

        {/* Observações da refeição */}
        <div className="space-y-3 pt-4 border-t border-rose-200 dark:border-rose-800">
          <label className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            Observações da Refeição
          </label>
          <Textarea
            placeholder="Observações específicas desta refeição..."
            value={meal.notes || ""}
            onChange={(e) => updateMealNotes(e.target.value)}
            className="min-h-[100px] bg-background/80 border-2 border-rose-200 dark:border-rose-800 focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:border-rose-400 dark:focus-visible:ring-rose-700 dark:focus-visible:border-rose-600 shadow-inner"
            data-testid={`textarea-meal-notes-${meal.id}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}