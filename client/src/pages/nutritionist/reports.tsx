// client/src/pages/nutritionist/reports.tsx

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2 } from "lucide-react";
import { NutritionistLayout } from "@/components/layout/nutritionist-layout";

export default function ReportsPage() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    toast({
      title: "Gerando relatório...",
      description: "Isso pode levar alguns instantes.",
    });

    try {
      console.log('Iniciating download request...');
      
      const response = await fetch("/api/nutritionist/reports/access-log", {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response error:', errorText);
        
        let errorMessage = "Falha ao gerar o relatório.";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          // If not JSON, use the text as error message if it's meaningful
          if (errorText.length < 200 && errorText.trim()) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      console.log('Content type:', contentType);
      
      if (!contentType || !contentType.includes('spreadsheetml.sheet')) {
        // Check if it's an error response disguised as success
        const text = await response.text();
        console.error('Unexpected content type, response body:', text);
        throw new Error("Resposta inválida do servidor. Verifique os logs.");
      }

      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error("Arquivo vazio recebido do servidor.");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio_de_acesso_pacientes.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Sucesso!",
        description: "Relatório baixado com sucesso.",
      });

    } catch (error) {
      console.error("Erro detalhado no download do relatório:", error);
      toast({
        title: "Erro!",
        description: error instanceof Error ? error.message : "Não foi possível baixar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <NutritionistLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <Card>
          <CardHeader>
            <CardTitle>Relatório de Acesso de Pacientes</CardTitle>
            <CardDescription>
              Exporte uma planilha em Excel com os dados de acesso e status dos seus pacientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isDownloading ? "Gerando..." : "Baixar Relatório em Excel"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </NutritionistLayout>
  );
}