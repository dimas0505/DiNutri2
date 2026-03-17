import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface MessageReportItem {
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  messageTitle: string;
  messageBody: string;
  messageType: string;
  isRead: boolean;
  createdAt: string | null;
}

interface MessageReportResponse {
  totals: {
    totalMessages: number;
    readMessages: number;
    unreadMessages: number;
  };
  report: MessageReportItem[];
}

export default function MessagesReadReportPage() {
  const { data, isLoading } = useQuery<MessageReportResponse>({
    queryKey: ["/api/nutritionist/reports/messages-read"],
    queryFn: async () => {
      const res = await fetch("/api/nutritionist/reports/messages-read", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Falha ao carregar relatório de mensagens.");
      }
      return res.json();
    },
  });

  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    toast({
      title: "Gerando relatório...",
      description: "Isso pode levar alguns instantes.",
    });

    try {
      const response = await fetch("/api/nutritionist/reports/messages-read/export", {
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
      a.download = 'relatorio_mensagens_lidas.xlsx';
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
      setIsExporting(false);
    }
  };

  return (
    <div className="px-4 py-4 md:px-0 md:py-0 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Relatório de Mensagens Lidas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe as mensagens enviadas e o status de leitura dos seus pacientes.</p>
        </div>
        <Link href="/reports">
          <Button variant="outline" size="sm">Voltar</Button>
        </Link>
      </div>

      <div className="rounded-xl p-4 text-white" style={{ background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Visão de mensagens e leitura</p>
            <p className="text-xs text-white/80">Confira quais mensagens foram lidas e por quais pacientes.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MetricCard 
          icon={MessageSquare} 
          label="Total de Mensagens" 
          value={data?.totals.totalMessages ?? 0} 
          color="bg-blue-50 text-blue-700"
        />
        <MetricCard 
          icon={CheckCircle2} 
          label="Mensagens Lidas" 
          value={data?.totals.readMessages ?? 0}
          color="bg-green-50 text-green-700"
        />
        <MetricCard 
          icon={AlertCircle} 
          label="Não Lidas" 
          value={data?.totals.unreadMessages ?? 0}
          color="bg-yellow-50 text-yellow-700"
        />
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Mensagens por Paciente</p>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || !data || data.report.length === 0}
            size="sm"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Exportando..." : "Exportar Excel"}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Carregando relatório...</p>
        ) : !data || data.report.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma mensagem encontrada.</p>
        ) : (
          <div className="space-y-3">
            {data.report.map((item, index) => (
              <div key={`${item.patientId}-${index}`} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-sm text-gray-900">{item.patientName}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        item.isRead 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.isRead ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Lida
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3" />
                            Não Lida
                          </>
                        )}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-2">{item.patientEmail || "Sem e-mail cadastrado"}</p>
                    
                    <div className="bg-gray-50 rounded-lg p-3 mb-2">
                      <p className="text-sm font-medium text-gray-900 mb-1">{item.messageTitle}</p>
                      <p className="text-sm text-gray-600 line-clamp-3">{item.messageBody}</p>
                    </div>
                    
                    <p className="text-xs text-gray-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : "Data não disponível"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ 
  icon: Icon, 
  label, 
  value,
  color 
}: { 
  icon: any; 
  label: string; 
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-xl border ${color.replace('text-', 'border-').replace('-700', '-200')} bg-white p-3`}>
      <div className={`flex items-center gap-2 ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-2 text-gray-900">{value}</p>
    </div>
  );
}
