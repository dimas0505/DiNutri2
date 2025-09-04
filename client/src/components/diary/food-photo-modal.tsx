import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MealData } from "@shared/schema";
import { Upload, Loader2 } from "lucide-react";

interface FoodPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  meal: MealData;
  prescriptionId: string;
}

export default function FoodPhotoModal({ isOpen, onClose, meal, prescriptionId }: FoodPhotoModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleClose = () => {
    // Reset state when closing the modal
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setNotes("");
    onClose();
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Nenhum arquivo selecionado.");

      // ETAPA 1: Obter a URL de upload pré-assinada do nosso backend.
      const response = await fetch('/api/food-diary/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao obter URL de upload.');
      }
      const presignedData = await response.json();
      const { url: uploadUrl, downloadUrl } = presignedData;

      // ETAPA 2: Fazer o upload do arquivo diretamente para a URL fornecida pelo Vercel Blob.
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Falha no upload da imagem para o armazenamento.');
      }

      // ETAPA 3: Salvar a entrada no diário no nosso DB com a URL final (downloadUrl).
      const entryPayload = {
        prescriptionId,
        mealId: meal.id,
        imageUrl: downloadUrl,
        notes,
        date: new Date().toISOString().split('T')[0],
      };
      await apiRequest("POST", "/api/food-diary/entries", entryPayload);
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Foto da refeição enviada." });
      queryClient.invalidateQueries({ queryKey: ['/api/food-diary/entries', prescriptionId] });
      handleClose();
    },
    onError: (error: any) => {
      console.error("Upload error:", error);
      toast({ title: "Erro", description: error.message || "Não foi possível enviar a foto.", variant: "destructive" });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Vercel Hobby plan has a 4.5MB limit
      if (selectedFile.size > 4.5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo do arquivo é de 4.5MB.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    uploadMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Foto do Diário para: {meal.name}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
          
          {previewUrl ? (
            <div className="text-center space-y-2">
              <img src={previewUrl} alt="Preview" className="max-h-60 w-auto mx-auto rounded-md border" />
              <Button type="button" variant="link" onClick={handleTriggerUpload}>Trocar foto</Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full h-32 border-dashed flex-col" onClick={handleTriggerUpload}>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span>Clique para selecionar uma foto</span>
            </Button>
          )}

          <Textarea placeholder="Adicionar observações (opcional)..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          
          <Button type="submit" className="w-full" disabled={!file || uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Foto"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}