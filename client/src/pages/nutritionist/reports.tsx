import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, Download, Loader2, LineChart, MessageSquare } from "lucide-react";

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
        method: "GET",
        credentials: "include",
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
    <div className="space-y-6 px-4 py-4 md:px-0 md:py-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralize aqui os relatórios de acesso e de notificações dos seus pacientes.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Relatório de Acesso de Pacientes
            </CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Relatório de Notificações
            </CardTitle>
            <CardDescription>
              Veja quem tem app ativo, quem habilitou push e quem recebeu mensagens no inbox.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reports/notifications">
              <Button variant="outline">Abrir Relatório de Notificações</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Relatório de Mensagens Lidas
            </CardTitle>
            <CardDescription>
              Visualize todas as mensagens enviadas e o status de leitura de cada paciente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reports/messages-read">
              <Button variant="outline">Abrir Relatório de Mensagens</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
