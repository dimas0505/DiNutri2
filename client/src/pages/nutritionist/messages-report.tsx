import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MessageSquare, Download, Loader2, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface MessageReportItem {
  notificationId: string;
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface MessageReportResponse {
  totals: {
    patients: number;
    totalMessages: number;
    readMessages: number;
    unreadMessages: number;
  };
  report: MessageReportItem[];
}

export default function MessagesReportPage() {
  const { data, isLoading } = useQuery<MessageReportResponse>({
    queryKey: ["/api/nutritionist/reports/messages"],
    queryFn: async () => {
      const res = await fetch("/api/nutritionist/reports/messages", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Falha ao carregar relatório de mensagens.");
      }
      return res.json();
    },
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    toast({
      title: "Gerando relatório...",
      description: "Isso pode levar alguns instantes.",
    });

    try {
      const response = await fetch("/api/nutritionist/reports/messages/export", {
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
      a.download = 'relatorio_de_mensagens_lidas.xlsx';
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
    <div className="px-4 py-4 md:px-0 md:py-0 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Relatório de Mensagens Lidas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe quais mensagens seus pacientes marcaram como lidas.</p>
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
            <p className="font-semibold text-sm">Visão de mensagens lidas</p>
            <p className="text-xs text-white/80">Confira o título, data/hora e conteúdo das mensagens por paciente.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard icon={MessageSquare} label="Pacientes" value={data?.totals.patients ?? 0} />
        <MetricCard icon={MessageSquare} label="Total de msgs" value={data?.totals.totalMessages ?? 0} />
        <MetricCard icon={CheckCircle2} label="Lidas" value={data?.totals.readMessages ?? 0} />
        <MetricCard icon={Clock} label="Não lidas" value={data?.totals.unreadMessages ?? 0} />
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Mensagens por Paciente</p>
          <Button onClick={handleDownloadExcel} disabled={isDownloading} size="sm">
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isDownloading ? "Exportando..." : "Exportar para Excel"}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Carregando relatório...</p>
        ) : !data || data.report.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma mensagem encontrada.</p>
        ) : (
          <div className="space-y-4">
            {/* Agrupar mensagens por paciente */}
            {Object.entries(
              data.report.reduce((acc: Record<string, MessageReportItem[]>, item) => {
                const key = `${item.patientId}|${item.patientName}|${item.patientEmail}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              }, {})
            ).map(([key, messages]) => {
              const [patientId, patientName, patientEmail] = key.split('|');
              return (
                <div key={key} className="border rounded-lg p-4 bg-gray-50">
                  <div className="mb-3">
                    <p className="font-semibold text-sm text-gray-900">{patientName}</p>
                    <p className="text-xs text-gray-500">{patientEmail || "Sem e-mail cadastrado"}</p>
                  </div>

                  <div className="space-y-2">
                    {messages.map((msg) => (
                      <div key={msg.notificationId} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{msg.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(msg.createdAt).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {msg.isRead ? (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700">
                                <CheckCircle2 className="h-3 w-3" />
                                <span className="text-xs font-medium">Lida</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs font-medium">Não lida</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 leading-relaxed">
                          {msg.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-center gap-2 text-gray-600">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}
