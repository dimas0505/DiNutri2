import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MealData } from "@shared/schema";
import { Upload, CheckCircle } from "lucide-react";
import { upload } from '@vercel/blob/client';

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

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Nenhum arquivo selecionado.");

      // Check if Vercel Blob is available by trying the upload-url endpoint first
      try {
        // Try Vercel Blob approach first (for production)
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/food-diary/upload-url',
        });

        // 2. Salva a entrada no diário no nosso DB com a URL retornada.
        const entryPayload = {
          prescriptionId,
          mealId: meal.id,
          imageUrl: blob.url,
          notes,
          date: new Date().toISOString().split('T')[0],
        };
        await apiRequest("POST", "/api/food-diary/entries", entryPayload);
      } catch (vercelBlobError) {
        console.log("Vercel Blob not available, falling back to local upload:", vercelBlobError);
        
        // Fallback to local file upload
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/food-diary/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Upload failed: ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();

        // 2. Salva a entrada no diário no nosso DB com a URL retornada.
        const entryPayload = {
          prescriptionId,
          mealId: meal.id,
          imageUrl: uploadResult.url,
          notes,
          date: new Date().toISOString().split('T')[0],
        };
        await apiRequest("POST", "/api/food-diary/entries", entryPayload);
      }
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Foto da refeição enviada." });
      queryClient.invalidateQueries({ queryKey: ['/api/food-diary/entries'] }); // Invalidate para futuras listagens
      onClose();
      // Resetar estado
      setFile(null);
      setPreviewUrl(null);
      setNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Não foi possível enviar a foto.", variant: "destructive" });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Foto do Diário para: {meal.name}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
          
          {previewUrl ? (
            <div className="text-center">
              <img src={previewUrl} alt="Preview" className="max-h-60 w-auto mx-auto rounded-md" />
              <Button type="button" variant="link" onClick={handleTriggerUpload}>Trocar foto</Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full h-32 border-dashed" onClick={handleTriggerUpload}>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="ml-2">Clique para enviar uma foto</span>
            </Button>
          )}

          <Textarea placeholder="Adicionar observações (opcional)..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          
          <Button type="submit" className="w-full" disabled={!file || uploadMutation.isPending}>
            {uploadMutation.isPending ? "Enviando..." : "Enviar Foto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}