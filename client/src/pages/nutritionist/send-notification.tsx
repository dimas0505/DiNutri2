// ARQUIVO: ./client/src/pages/nutritionist/send-notification.tsx
// Página para o nutricionista enviar notificações push personalizadas

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Send, Users, User, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Patient } from "@shared/schema";

interface PatientWithUser extends Patient {
  userId: string | null;
}

export default function SendNotificationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "specific">("all");
  const [selectedPatientUserId, setSelectedPatientUserId] = useState<string>("");
  const [lastResult, setLastResult] = useState<{ sent: number; message: string } | null>(null);

  // Buscar lista de pacientes com conta de usuário
  const { data: patients = [], isLoading: patientsLoading } = useQuery<PatientWithUser[]>({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Filtrar apenas pacientes que têm userId (conta ativa no app)
  const patientsWithApp = patients.filter((p) => p.userId);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = { title, body };
      if (target === "specific" && selectedPatientUserId) {
        payload.targetUserId = selectedPatientUserId;
      }
      const res = await apiRequest("POST", "/api/push/send-message", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Falha ao enviar notificação.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setLastResult(data);
      setTitle("");
      setBody("");
      setSelectedPatientUserId("");
      toast({
        title: "Notificação enviada!",
        description: data.sent > 0
          ? `${data.sent} dispositivo(s) notificado(s) com sucesso.`
          : "Nenhum dispositivo encontrado com notificações ativas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e a mensagem antes de enviar.",
        variant: "destructive",
      });
      return;
    }
    if (target === "specific" && !selectedPatientUserId) {
      toast({
        title: "Selecione um paciente",
        description: "Escolha um paciente para envio individual.",
        variant: "destructive",
      });
      return;
    }
    sendMutation.mutate();
  };

  const selectedPatient = patientsWithApp.find((p) => p.userId === selectedPatientUserId);

  return (
    <MobileLayout title="Enviar Notificação" showBackButton>
      <div className="px-4 pb-8 pt-2 space-y-5">

        {/* Header informativo */}
        <div className="rounded-2xl overflow-hidden shadow-sm"
             style={{ background: "linear-gradient(135deg, #4E9F87 0%, #3d8a74 100%)" }}>
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Notificações Push</p>
              <p className="text-white/80 text-xs mt-0.5 leading-relaxed">
                Envie mensagens diretamente para os dispositivos dos seus pacientes, mesmo com o app fechado.
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Destinatário */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-[#4E9F87]" />
              <Label className="text-sm font-semibold text-gray-700">Destinatário</Label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTarget("all")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  target === "all"
                    ? "border-[#4E9F87] bg-[#4E9F87]/5 text-[#4E9F87]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium">Todos os pacientes</span>
              </button>
              <button
                type="button"
                onClick={() => setTarget("specific")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  target === "specific"
                    ? "border-[#4E9F87] bg-[#4E9F87]/5 text-[#4E9F87]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <User className="h-5 w-5" />
                <span className="text-xs font-medium">Paciente específico</span>
              </button>
            </div>

            {target === "specific" && (
              <div className="mt-2">
                {patientsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando pacientes...
                  </div>
                ) : patientsWithApp.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Nenhum paciente com o app instalado e notificações ativas.
                  </div>
                ) : (
                  <Select value={selectedPatientUserId} onValueChange={setSelectedPatientUserId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um paciente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patientsWithApp.map((p) => (
                        <SelectItem key={p.userId!} value={p.userId!}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {target === "all" && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
                A notificação será enviada para todos os pacientes que instalaram o app e ativaram as notificações.
                {patientsWithApp.length > 0 && (
                  <span className="font-medium text-[#4E9F87]"> ({patientsWithApp.length} paciente(s) com app)</span>
                )}
              </p>
            )}
          </div>

          {/* Título e Mensagem */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-[#4E9F87]" />
              <Label className="text-sm font-semibold text-gray-700">Conteúdo da Notificação</Label>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notif-title" className="text-xs text-gray-500">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="notif-title"
                placeholder="Ex: Lembrete importante"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="text-sm"
              />
              <p className="text-right text-xs text-gray-400">{title.length}/100</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notif-body" className="text-xs text-gray-500">
                Mensagem <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="notif-body"
                placeholder="Ex: Não esqueça de registrar suas refeições hoje!"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={300}
                rows={4}
                className="text-sm resize-none"
              />
              <p className="text-right text-xs text-gray-400">{body.length}/300</p>
            </div>
          </div>

          {/* Preview */}
          {(title || body) && (
            <div className="rounded-xl border border-dashed border-[#4E9F87]/40 bg-[#4E9F87]/5 p-4">
              <p className="text-xs font-semibold text-[#4E9F87] mb-2 uppercase tracking-wide">Pré-visualização</p>
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <div className="flex items-start gap-2.5">
                  <img src="/icon-72x72.png" alt="DiNutri" className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 leading-tight">{title || "Título da notificação"}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{body || "Conteúdo da mensagem..."}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resultado do último envio */}
          {lastResult && (
            <div className={`flex items-center gap-3 rounded-xl p-3.5 ${
              lastResult.sent > 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"
            }`}>
              {lastResult.sent > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-semibold ${lastResult.sent > 0 ? "text-green-700" : "text-amber-700"}`}>
                  {lastResult.sent > 0 ? `${lastResult.sent} dispositivo(s) notificado(s)` : "Nenhum dispositivo ativo"}
                </p>
                <p className={`text-xs mt-0.5 ${lastResult.sent > 0 ? "text-green-600" : "text-amber-600"}`}>
                  {lastResult.sent === 0
                    ? "Os pacientes precisam instalar o app e ativar as notificações."
                    : "Notificação enviada com sucesso!"}
                </p>
              </div>
            </div>
          )}

          {/* Botão de envio */}
          <Button
            type="submit"
            disabled={sendMutation.isPending || !title.trim() || !body.trim()}
            className="w-full h-12 text-sm font-semibold bg-[#4E9F87] hover:bg-[#3d8a74] text-white rounded-xl"
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {target === "all" ? "Enviar para Todos" : `Enviar para ${selectedPatient?.name || "Paciente"}`}
              </>
            )}
          </Button>
        </form>
      </div>
    </MobileLayout>
  );
}
