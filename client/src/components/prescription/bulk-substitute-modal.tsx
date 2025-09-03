import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface BulkSubstituteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSubstitutes: (substitutes: string[]) => void;
}

export default function BulkSubstituteModal({
  isOpen,
  onClose,
  onAddSubstitutes,
}: BulkSubstituteModalProps) {
  const [bulkText, setBulkText] = useState("");
  const { toast } = useToast();

  const handleAdd = () => {
    if (!bulkText.trim()) {
      toast({
        title: "Nenhum texto inserido",
        description: "Por favor, cole a lista de substitutos na área de texto.",
        variant: "destructive",
      });
      return;
    }

    // Separa por nova linha ou ponto e vírgula, limpa e ordena
    const parsedSubstitutes = bulkText
      .split(/[\n;]/) // Separa por nova linha OU ponto e vírgula
      .map(item => item.trim()) // Remove espaços em branco extras
      .filter(item => item.length > 0); // Remove linhas vazias

    if (parsedSubstitutes.length === 0) {
      toast({
        title: "Formato inválido",
        description: "Não foi possível encontrar itens válidos no texto colado.",
        variant: "destructive",
      });
      return;
    }

    onAddSubstitutes(parsedSubstitutes);
    setBulkText(""); // Limpa o campo após adicionar
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Substitutos em Lote</DialogTitle>
          <DialogDescription>
            Cole sua lista de substitutos abaixo. Separe cada item com uma
            quebra de linha (Enter) ou ponto e vírgula (;).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Exemplo:
Pão integral - 1 fatia
Tapioca - 2 colheres de sopa
..."
            className="min-h-[200px]"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleAdd}>
            Adicionar Substitutos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}