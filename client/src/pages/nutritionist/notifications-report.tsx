import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { apiRequest } from "@/lib/queryClient";
import { Bell, CheckCircle2, Smartphone, Users, XCircle } from "lucide-react";

interface NotificationReportItem {
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  userId: string | null;
  hasAccount: boolean;
  hasPushEnabled: boolean;
  pushSubscriptions: number;
  messagesReceived: number;
  lastMessageReceivedAt: string | null;
}

interface NotificationReportResponse {
  totals: {
    patients: number;
    withAccount: number;
    withPushEnabled: number;
    receivedMessages: number;
  };
  report: NotificationReportItem[];
}

export default function NotificationsReportPage() {
  const { data, isLoading } = useQuery<NotificationReportResponse>({
    queryKey: ["/api/push/report"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/push/report");
      if (!res.ok) {
        throw new Error("Falha ao carregar relatório de notificações.");
      }
      return res.json();
    },
  });

  return (
    <MobileLayout title="Relatório de Notificações" showBackButton>
      <div className="px-4 py-3 space-y-4">
        <div className="rounded-xl p-4 text-white" style={{ background: "linear-gradient(135deg, #4E9F87 0%, #3d8a74 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Visão de adesão às notificações</p>
              <p className="text-xs text-white/80">Confira quem ativou push e quem já recebeu mensagens in-app.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricCard icon={Users} label="Pacientes" value={data?.totals.patients ?? 0} />
          <MetricCard icon={Smartphone} label="Com conta" value={data?.totals.withAccount ?? 0} />
          <MetricCard icon={CheckCircle2} label="Push ativo" value={data?.totals.withPushEnabled ?? 0} />
          <MetricCard icon={Bell} label="Receberam msg" value={data?.totals.receivedMessages ?? 0} />
        </div>

        <div className="rounded-xl border bg-white p-3">
          <p className="text-sm font-semibold mb-2">Pacientes</p>

          {isLoading ? (
            <p className="text-sm text-gray-500">Carregando relatório...</p>
          ) : !data || data.report.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum paciente encontrado.</p>
          ) : (
            <div className="space-y-2">
              {data.report.map((item) => (
                <div key={item.patientId} className="border rounded-lg p-3">
                  <p className="font-medium text-sm">{item.patientName}</p>
                  <p className="text-xs text-gray-500">{item.patientEmail || "Sem e-mail cadastrado"}</p>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge ok={item.hasAccount} okText="Com app" failText="Sem app" />
                    <Badge ok={item.hasPushEnabled} okText="Push ativo" failText="Push inativo" />
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      Msgs recebidas: {item.messagesReceived}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      Assinaturas: {item.pushSubscriptions}
                    </span>
                  </div>

                  {item.lastMessageReceivedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Última mensagem: {new Date(item.lastMessageReceivedAt).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
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

function Badge({ ok, okText, failText }: { ok: boolean; okText: string; failText: string }) {
  return (
    <span className={`px-2 py-1 rounded-full inline-flex items-center gap-1 ${ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {ok ? okText : failText}
    </span>
  );
}
