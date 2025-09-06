import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import heic2any from 'heic2any';
import imageCompression from 'browser-image-compression';
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
  const [isProcessing, setIsProcessing] = useState(false);
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

      // ETAPA 1: Enviar para o endpoint otimizado que processa com Sharp
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/food-diary/upload-optimized', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no upload');
      }

      const { url } = await response.json();

      // ETAPA 2: Salvar a URL final no nosso banco de dados.
      const entryPayload = {
        prescriptionId,
        mealId: meal.id,
        imageUrl: url,
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 15 * 1024 * 1024) { // Limite inicial de 15MB para permitir processamento
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo do arquivo é de 15MB.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    let fileToProcess = selectedFile;

    try {
      // Verifica se o arquivo é HEIC/HEIF e o converte para JPEG
      const isHeic = fileToProcess.type === 'image/heic' || 
                     fileToProcess.type === 'image/heif' || 
                     fileToProcess.name.toLowerCase().endsWith('.heic');
      
      if (isHeic) {
        toast({ title: 'Convertendo foto...', description: 'Aguarde um momento.' });
        
        try {
          const convertedBlob = await heic2any({
            blob: fileToProcess,
            toType: 'image/jpeg',
            quality: 0.8,
          });
          
          const fileName = fileToProcess.name.replace(/\.[^/.]+$/, ".jpeg");
          fileToProcess = new File([convertedBlob as Blob], fileName, { type: 'image/jpeg' });
        } catch (error) {
          console.error('Erro ao converter HEIC:', error);
          toast({
            title: 'Formato de foto não suportado',
            description: 'Não foi possível converter a foto para um formato compatível.',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }
      }

      // Comprimir a imagem (já convertida se necessário)
      toast({ title: 'Processando imagem...', description: 'Otimizando qualidade e tamanho.' });
      
      const options = {
        maxSizeMB: 1.5,          // Define o tamanho máximo do arquivo em MB
        maxWidthOrHeight: 1920,  // Define a largura ou altura máxima
        useWebWorker: true,      // Usa Web Worker para não travar a interface
      };

      const compressedFile = await imageCompression(fileToProcess, options);
      console.log('Arquivo original:', selectedFile.size, 'bytes');
      console.log('Arquivo processado:', compressedFile.size, 'bytes');

      // Limpar preview anterior
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Definir arquivo processado e gerar preview
      setFile(compressedFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));

      toast({ 
        title: 'Imagem processada!', 
        description: 'Foto pronta para envio.' 
      });

    } catch (error) {
      console.error('Erro ao processar a imagem:', error);
      toast({
        title: 'Erro ao processar imagem',
        description: 'Não foi possível processar a foto selecionada.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
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
          <Input 
            type="file" 
            accept="image/*,.heic" 
            onChange={handleFileChange} 
            ref={fileInputRef} 
            className="hidden" 
            disabled={isProcessing}
          />
          
          {isProcessing && (
            <div className="text-center space-y-2 p-4 border rounded-md bg-muted">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Processando imagem...</p>
            </div>
          )}

          {previewUrl ? (
            <div className="text-center space-y-2">
              <img src={previewUrl} alt="Preview" className="max-h-60 w-auto mx-auto rounded-md border" />
              <Button 
                type="button" 
                variant="link" 
                onClick={handleTriggerUpload}
                disabled={isProcessing}
              >
                Trocar foto
              </Button>
            </div>
          ) : (
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-32 border-dashed flex-col" 
              onClick={handleTriggerUpload}
              disabled={isProcessing}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span>Clique para selecionar uma foto</span>
            </Button>
          )}

          <Textarea 
            placeholder="Adicionar observações (opcional)..." 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            disabled={isProcessing}
          />
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!file || uploadMutation.isPending || isProcessing}
          >
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