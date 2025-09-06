import { useState } from "react";
import { GripVertical, X, ChevronUp, ChevronDown, Plus, Trash2, Pencil, Check } from "lucide-react";
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
  const [isSubstitutesOpen, setIsSubstitutesOpen] = useState(false); // Changed to default closed
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [newSubstitute, setNewSubstitute] = useState("");
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<Set<number>>(new Set());
  const [editingSubstituteIndex, setEditingSubstituteIndex] = useState<number | null>(null);
  const [editingSubstituteValue, setEditingSubstituteValue] = useState("");
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
    // Cancel editing if the item being edited was removed
    if (editingSubstituteIndex === index) {
      setEditingSubstituteIndex(null);
    }
  };

  const startEditingSubstitute = (index: number) => {
    setEditingSubstituteIndex(index);
    setEditingSubstituteValue(item.substitutes?.[index] || "");
  };

  const saveSubstituteEdit = () => {
    if (editingSubstituteIndex !== null && editingSubstituteValue.trim()) {
      const substitutes = [...(item.substitutes || [])];
      substitutes[editingSubstituteIndex] = editingSubstituteValue.trim();
      substitutes.sort((a, b) => a.localeCompare(b)); // Maintain order
      onUpdate({ 
        ...item, 
        substitutes: substitutes
      });
      setEditingSubstituteIndex(null);
      setEditingSubstituteValue("");
      toast({
        title: "Substituto atualizado",
        description: "O substituto foi atualizado com sucesso.",
      });
    }
  };

  const cancelSubstituteEdit = () => {
    setEditingSubstituteIndex(null);
    setEditingSubstituteValue("");
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
      <div className="bg-gradient-to-br from-cyan-50 via-background to-blue-50 dark:from-cyan-950/20 dark:via-background dark:to-blue-950/20 border-2 border-cyan-200 dark:border-cyan-800 rounded-xl p-3 sm:p-4 space-y-4 shadow-lg hover:shadow-xl transition-shadow">
        {/* Linha principal do item */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="cursor-move text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-900/30 shadow-sm border border-cyan-200 dark:border-cyan-800">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 w-full space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
            <Input
              type="text"
              placeholder="Ex: Pão francês"
              className="text-sm bg-background/80 border-2 border-cyan-200 dark:border-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:border-cyan-400 dark:focus-visible:ring-cyan-700 dark:focus-visible:border-cyan-600 shadow-sm"
              value={item.description}
              onChange={(e) => updateDescription(e.target.value)}
              data-testid={`input-item-description-${item.id}`}
            />
            <Input
              type="text"
              placeholder="Ex: 1 unidade (50g)"
              className="text-sm bg-background/80 border-2 border-cyan-200 dark:border-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:border-cyan-400 dark:focus-visible:ring-cyan-700 dark:focus-visible:border-cyan-600 shadow-sm"
              value={item.amount}
              onChange={(e) => updateAmount(e.target.value)}
              data-testid={`input-item-amount-${item.id}`}
            />
          </div>
          <div className="flex space-x-2 w-full sm:w-auto justify-end">
            {onMoveUp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveUp}
                title="Mover para cima"
                data-testid={`button-move-item-up-${item.id}`}
                className="hover:bg-cyan-100 dark:hover:bg-cyan-900/30 shadow-sm border border-cyan-200 dark:border-cyan-800"
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
                className="hover:bg-cyan-100 dark:hover:bg-cyan-900/30 shadow-sm border border-cyan-200 dark:border-cyan-800"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive/80 hover:bg-destructive/20 shadow-sm border border-destructive/30"
              data-testid={`button-delete-item-${item.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Seção de substitutos */}
        <Collapsible open={isSubstitutesOpen} onOpenChange={setIsSubstitutesOpen}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-cyan-200 dark:border-cyan-800 space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-cyan-700 dark:text-cyan-300 hover:text-cyan-900 dark:hover:text-cyan-100 p-3 h-auto rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 shadow-sm border border-cyan-200 dark:border-cyan-800 w-full sm:w-auto justify-center sm:justify-start"
                >
                  <Plus className="h-3 w-3 mr-2" />
                  {item.substitutes && item.substitutes.length > 0 
                    ? `${item.substitutes.length} substituto(s) - ${isSubstitutesOpen ? 'Recolher' : 'Expandir'}`
                    : "Adicionar substitutos"
                  }
                </Button>
              </CollapsibleTrigger>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-cyan-700 dark:text-cyan-300 hover:text-cyan-900 dark:hover:text-cyan-100 p-3 h-auto rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 shadow-sm border border-cyan-200 dark:border-cyan-800 w-full sm:w-auto justify-center sm:justify-start"
                onClick={() => setIsBulkModalOpen(true)}
              >
                <Plus className="h-3 w-3 mr-2" />
                Adicionar em lote
              </Button>
            </div>
            
            {!isSubstitutesOpen && item.substitutes && item.substitutes.length > 0 && (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {item.substitutes.slice(0, 3).map((substitute, index) => (
                  <Badge key={index} variant="secondary" className="text-xs px-3 py-1 shadow-sm bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200">
                    {substitute}
                  </Badge>
                ))}
                {item.substitutes.length > 3 && (
                  <Badge variant="outline" className="text-xs px-3 py-1 shadow-sm border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300">
                    +{item.substitutes.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <CollapsibleContent className="space-y-4 mt-4">
            {/* Controles de seleção em lote */}
            {item.substitutes && item.substitutes.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg border-2 border-cyan-200 dark:border-cyan-800 shadow-inner space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                   <Checkbox
                    id={`select-all-${item.id}`}
                    checked={allSelected}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    aria-label="Selecionar todos"
                    className="border-cyan-400 dark:border-cyan-600"
                  />
                  <label htmlFor={`select-all-${item.id}`} className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
                    Selecionar Todos
                  </label>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={selectedSubstitutes.size === 0}
                  className="shadow-md w-full sm:w-auto"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Excluir ({selectedSubstitutes.size})
                </Button>
              </div>
            )}

            {/* Lista de substitutos editáveis */}
            {item.substitutes && item.substitutes.length > 0 && (
              <div className="space-y-3">
                {item.substitutes.map((substitute, index) => {
                  const isEditing = editingSubstituteIndex === index;
                  
                  return (
                    <div key={index} className="flex items-center space-x-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg p-4 border-2 border-cyan-200 dark:border-cyan-800 shadow-sm">
                      {!isEditing && (
                        <Checkbox
                          id={`sub-${item.id}-${index}`}
                          checked={selectedSubstitutes.has(index)}
                          onCheckedChange={() => handleToggleSelect(index)}
                          className="border-cyan-400 dark:border-cyan-600"
                        />
                      )}
                      
                      {isEditing ? (
                        <>
                          <Input
                            value={editingSubstituteValue}
                            onChange={(e) => setEditingSubstituteValue(e.target.value)}
                            className="text-sm flex-1 bg-background/80 border-2 border-cyan-200 dark:border-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:border-cyan-400 dark:focus-visible:ring-cyan-700 dark:focus-visible:border-cyan-600"
                            placeholder="Nome do substituto"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveSubstituteEdit();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelSubstituteEdit();
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={saveSubstituteEdit}
                            disabled={!editingSubstituteValue.trim()}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                            title="Salvar"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelSubstituteEdit}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/30"
                            title="Cancelar"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <label htmlFor={`sub-${item.id}-${index}`} className="text-sm flex-1 cursor-pointer text-cyan-800 dark:text-cyan-200 font-medium">
                            {substitute}
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingSubstitute(index)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            title="Editar"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubstitute(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/20 shadow-sm border border-destructive/30"
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Input para adicionar novo substituto */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-3">
              <Input
                type="text"
                placeholder="Ex: Pão integral, Tapioca..."
                className="text-sm bg-background/80 border-2 border-cyan-200 dark:border-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:border-cyan-400 dark:focus-visible:ring-cyan-700 dark:focus-visible:border-cyan-600 shadow-sm flex-1"
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
                className="px-6 shadow-md border-2 border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-950/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 w-full sm:w-auto"
              >
                <Plus className="h-3 w-3 mr-2" />
                Adicionar
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