import { useState } from "react";
import { GripVertical, X, ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // Importando o Checkbox
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MealItemData } from "@shared/schema";
import BulkSubstituteModal from "./bulk-substitute-modal";
import { useToast } from "@/hooks/use-toast";

interface MealItemEditorProps {
  item: MealItemData;
  onUpdate: (item: MealItemData) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function MealItemEditor({ item, onUpdate, onDelete, onMoveUp, onMoveDown }: MealItemEditorProps) {
  const [isSubstitutesOpen, setIsSubstitutesOpen] = useState(!!item.substitutes && item.substitutes.length > 0);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [newSubstitute, setNewSubstitute] = useState("");
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const updateDescription = (description: string) => {
    onUpdate({ ...item, description });
  };

  const updateAmount = (amount: string) => {
    onUpdate({ ...item, amount });
  };

  const addSubstitute = () => {
    if (newSubstitute.trim()) {
      const substitutes = (item.substitutes || []).concat(newSubstitute.trim());
      substitutes.sort((a, b) => a.localeCompare(b)); // Mantém a ordem
      onUpdate({ 
        ...item, 
        substitutes: substitutes
      });
      setNewSubstitute("");
    }
  };
  
  const handleAddBulkSubstitutes = (newSubstitutes: string[]) => {
    const currentSubstitutes = item.substitutes || [];
    const existingSet = new Set(currentSubstitutes.map(s => s.trim().toLowerCase()));

    const uniqueNewItems = newSubstitutes.filter(
      sub => !existingSet.has(sub.trim().toLowerCase())
    );

    if (uniqueNewItems.length === 0) {
      toast({
        title: "Nenhum item novo",
        description: "Todos os substitutos da lista já existem ou a lista está vazia.",
      });
      return;
    }

    const combined = [...currentSubstitutes, ...uniqueNewItems];
    combined.sort((a, b) => a.localeCompare(b));

    onUpdate({
      ...item,
      substitutes: combined,
    });
    
    toast({
      title: "Sucesso!",
      description: `${uniqueNewItems.length} novo(s) substituto(s) foram adicionados.`,
    });
  };

  const removeSubstitute = (index: number) => {
    const substitutes = item.substitutes || [];
    const updatedSubstitutes = substitutes.filter((_, i) => i !== index);
    onUpdate({ 
      ...item, 
      substitutes: updatedSubstitutes.length > 0 ? updatedSubstitutes : undefined 
    });
    // Limpa a seleção após a remoção para evitar inconsistências
    setSelectedSubstitutes(new Set());
  };

  const handleToggleSelect = (index: number) => {
    const newSelection = new Set(selectedSubstitutes);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedSubstitutes(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(item.substitutes?.map((_, index) => index) || []);
      setSelectedSubstitutes(allIndices);
    } else {
      setSelectedSubstitutes(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (selectedSubstitutes.size === 0) return;

    const updatedSubstitutes = (item.substitutes || []).filter(
      (_, index) => !selectedSubstitutes.has(index)
    );

    onUpdate({
      ...item,
      substitutes: updatedSubstitutes.length > 0 ? updatedSubstitutes : undefined,
    });
    
    toast({
        title: "Itens removidos",
        description: `${selectedSubstitutes.size} substituto(s) foram excluídos.`
    });
    
    setSelectedSubstitutes(new Set()); // Limpa a seleção
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubstitute();
    }
  };

  const allSelected = selectedSubstitutes.size > 0 && selectedSubstitutes.size === (item.substitutes?.length || 0);
  const someSelected = selectedSubstitutes.size > 0 && !allSelected;

  return (
    <>
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
            <div className="flex items-center space-x-4">
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
                onClick={() => setIsBulkModalOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar em lote
              </Button>
            </div>
            
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
            {/* Controles de seleção em lote */}
            {item.substitutes && item.substitutes.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                <div className="flex items-center space-x-2">
                   <Checkbox
                    id={`select-all-${item.id}`}
                    checked={allSelected}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    aria-label="Selecionar todos"
                  />
                  <label htmlFor={`select-all-${item.id}`} className="text-sm font-medium">
                    Selecionar Todos
                  </label>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={selectedSubstitutes.size === 0}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Excluir ({selectedSubstitutes.size})
                </Button>
              </div>
            )}

            {/* Lista de substitutos editáveis */}
            {item.substitutes && item.substitutes.length > 0 && (
              <div className="space-y-1">
                {item.substitutes.map((substitute, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-muted/30 rounded p-2">
                    <Checkbox
                      id={`sub-${item.id}-${index}`}
                      checked={selectedSubstitutes.has(index)}
                      onCheckedChange={() => handleToggleSelect(index)}
                    />
                    <label htmlFor={`sub-${item.id}-${index}`} className="text-sm flex-1 cursor-pointer">
                      {substitute}
                    </label>
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

      <BulkSubstituteModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onAddSubstitutes={handleAddBulkSubstitutes}
      />
    </>
  );
}