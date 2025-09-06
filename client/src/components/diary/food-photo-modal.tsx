import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upload } from '@vercel/blob/client';
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

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', file);

      // Upload to our server with image processing
      const uploadResponse = await fetch('/api/food-diary/upload-direct', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Erro no upload da imagem');
      }

      const uploadResult = await uploadResponse.json();

      // Save the entry with the processed image URL
      const entryPayload = {
        prescriptionId,
        mealId: meal.id,
        imageUrl: uploadResult.url,
        notes,
        date: new Date().toISOString().split('T')[0],
      };
      
      await apiRequest("POST", "/api/food-diary/entries", entryPayload);
      
      return uploadResult;
    },
    onSuccess: (result) => {
      const compressionMessage = result.compressionRatio > 0 
        ? ` (Imagem otimizada: ${result.compressionRatio}% menor)`
        : '';
      
      toast({ 
        title: "Sucesso!", 
        description: `Foto da refeição enviada${compressionMessage}.` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/food-diary/entries', prescriptionId] });
      handleClose();
    },
    onError: (error: any) => {
      console.error("Upload error:", error);
      
      // Extract meaningful error message
      let errorMessage = "Não foi possível enviar a foto.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({ 
        title: "Erro", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 4.5 * 1024 * 1024) { // Limite de 4.5MB do plano Hobby da Vercel
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