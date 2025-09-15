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
      const response = await fetch("/api/nutritionist/reports/access-log", {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error("Falha ao gerar o relatório.");
      }

      const blob = await response.blob();
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
      console.error("Erro no download do relatório:", error);
      toast({
        title: "Erro!",
        description: "Não foi possível baixar o relatório. Tente novamente.",
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