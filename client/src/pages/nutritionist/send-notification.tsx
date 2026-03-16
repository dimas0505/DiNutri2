// ARQUIVO: ./client/src/pages/nutritionist/send-notification.tsx
// Página para o nutricionista enviar notificações push personalizadas

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Send, Users, CheckCircle2, AlertCircle, Loader2, Search, Calendar, XCircle } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface NotificationReportItem {
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  userId: string | null;
  hasAccount: boolean;
  hasPushEnabled: boolean;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string | null;
}

interface NotificationReportResponse {
  report: NotificationReportItem[];
}

export default function SendNotificationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "selection" | "filter">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [lastResult, setLastResult] = useState<{ sent: number; message: string } | null>(null);

  // Buscar relatório detalhado de pacientes
  const { data: reportData, isLoading: reportLoading } = useQuery<NotificationReportResponse>({
    queryKey: ["/api/push/report"],
    queryFn: async () => {
      const res = await fetch("/api/push/report", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar relatório.");
      return res.json();
    },
  });

  const patients = useMemo(() => {
    if (!reportData?.report || !Array.isArray(reportData.report)) return [];
    return reportData.report;
  }, [reportData]);

  const patientsWithApp = useMemo(() => {
    return patients.filter(p => p && p.hasAccount && p.userId);
  }, [patients]);

  // Filtros pré-definidos - SIMPLIFICADO
  const filteredPatients = useMemo(() => {
    let result = patientsWithApp;

    // Filtro por busca
    if (searchTerm && searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => {
        const name = (p.patientName || "").toLowerCase();
        const email = (p.patientEmail || "").toLowerCase();
        return name.includes(lowerSearch) || email.includes(lowerSearch);
      });
    }

    // Filtro por status
    if (target === "filter" && activeFilter !== "all") {
      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(now.getDate() + 7);

      if (activeFilter === "active") {
        result = result.filter(p => p.subscriptionStatus === "active");
      } else if (activeFilter === "inactive") {
        result = result.filter(p => p.subscriptionStatus !== "active");
      } else if (activeFilter === "expiring") {
        result = result.filter(p => {
          if (!p.subscriptionExpiresAt) return false;
          try {
            const expiryDate = new Date(p.subscriptionExpiresAt);
            return expiryDate > now && expiryDate <= sevenDaysFromNow;
          } catch {
            return false;
          }
        });
      }
    }

    return result;
  }, [patientsWithApp, searchTerm, activeFilter, target]);

  // Auto-selecionar ao mudar filtro - corrigido para evitar loop infinito
  useEffect(() => {
    if (target === "filter" && activeFilter !== "all") {
      const newIds = filteredPatients
        .map(p => p.userId)
        .filter((id): id is string => !!id && typeof id === "string");
      
      // Só atualiza se a lista de IDs realmente mudou para evitar loop de renderização
      setSelectedUserIds(prev => {
        if (prev.length === newIds.length && prev.every((id, i) => id === newIds[i])) {
          return prev;
        }
        return newIds;
      });
    }
  }, [activeFilter, target, filteredPatients]);

  const togglePatientSelection = useCallback((userId: string | null) => {
    if (!userId || typeof userId !== "string") return;
    setSelectedUserIds(prev => {
      const newIds = [...prev];
      const idx = newIds.indexOf(userId);
      if (idx >= 0) {
        newIds.splice(idx, 1);
      } else {
        newIds.push(userId);
      }
      return newIds;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    const newIds = [];
    for (let i = 0; i < filteredPatients.length; i++) {
      const p = filteredPatients[i];
      if (p && p.userId && typeof p.userId === "string") {
        newIds.push(p.userId);
      }
    }
    setSelectedUserIds(newIds);
  }, [filteredPatients]);

  const clearSelection = useCallback(() => {
    setSelectedUserIds([]);
  }, []);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { title, body };
      
      if (target === "selection" || target === "filter") {
        if (selectedUserIds.length === 0) {
          throw new Error("Selecione pelo menos um paciente.");
        }
        payload.targetUserIds = selectedUserIds;
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
      if (target !== "all") setSelectedUserIds([]);
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
    if (target !== "all" && selectedUserIds.length === 0) {
      toast({
        title: "Selecione destinatários",
        description: "Escolha pelo menos um paciente para enviar.",
        variant: "destructive",
      });
      return;
    }
    sendMutation.mutate();
  };

  return (
    <MobileLayout title="Enviar Notificação" showBackButton>
      <div className="px-4 pb-8 pt-2 space-y-5">

        <div className="rounded-2xl overflow-hidden shadow-sm"
             style={{ background: "linear-gradient(135deg, #4E9F87 0%, #3d8a74 100%)" }}>
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Notificações Push</p>
              <p className="text-white/80 text-xs mt-0.5 leading-relaxed">
                Envie mensagens diretamente para os dispositivos dos seus pacientes.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-[#4E9F87]" />
              <Label className="text-sm font-semibold text-gray-700">Destinatário</Label>
            </div>

            <Tabs value={target} onValueChange={(v: any) => setTarget(v)} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                <TabsTrigger value="selection" className="text-xs">Seleção</TabsTrigger>
                <TabsTrigger value="filter" className="text-xs">Filtros</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  A notificação será enviada para todos os pacientes que instalaram o app.
                  {patientsWithApp.length > 0 && (
                    <span className="font-medium text-[#4E9F87]"> ({patientsWithApp.length} paciente(s) com app)</span>
                  )}
                </p>
              </TabsContent>

              <TabsContent value="selection" className="mt-0 space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar paciente..."
                    className="pl-9 h-9 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-medium text-gray-500 uppercase">
                    {selectedUserIds.length} selecionado(s)
                  </span>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={selectAllFiltered}>
                      Selecionar Todos
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-red-500" onClick={clearSelection}>
                      Limpar
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[200px] rounded-md border border-gray-100 p-2">
                  {reportLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  ) : filteredPatients.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-10">Nenhum paciente encontrado.</p>
                  ) : (
                    <div className="space-y-1">
                      {filteredPatients.map((p) => {
                        if (!p || !p.patientId) return null;
                        const isSelected = p.userId ? selectedUserIds.includes(p.userId) : false;
                        return (
                          <div 
                            key={p.patientId} 
                            className={cn(
                              "flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-gray-50",
                              isSelected && "bg-[#4E9F87]/5"
                            )}
                            onClick={() => togglePatientSelection(p.userId)}
                          >
                            <Checkbox 
                              checked={isSelected} 
                              onCheckedChange={() => togglePatientSelection(p.userId)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 truncate">{p.patientName}</p>
                              <p className="text-[10px] text-gray-400 truncate">{p.patientEmail || "Sem e-mail"}</p>
                            </div>
                            {!p.hasPushEnabled && (
                              <div title="Push inativo">
                                <AlertCircle className="h-3 w-3 text-amber-400" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="filter" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <FilterButton 
                    active={activeFilter === "active"} 
                    onClick={() => setActiveFilter("active")}
                    icon={CheckCircle2}
                    label="Pacientes com plano ativo"
                    color="green"
                  />
                  <FilterButton 
                    active={activeFilter === "inactive"} 
                    onClick={() => setActiveFilter("inactive")}
                    icon={XCircle}
                    label="Pacientes inativos"
                    color="red"
                  />
                  <FilterButton 
                    active={activeFilter === "expiring"} 
                    onClick={() => setActiveFilter("expiring")}
                    icon={Calendar}
                    label="Vencimento em 7 dias"
                    color="amber"
                  />
                </div>
                
                {selectedUserIds.length > 0 && (
                  <p className="text-[10px] text-center text-[#4E9F87] font-medium">
                    {selectedUserIds.length} paciente(s) selecionado(s) pelo filtro.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>

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
              <p className="text-right text-[10px] text-gray-400">{title.length}/100</p>
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
              <p className="text-right text-[10px] text-gray-400">{body.length}/300</p>
            </div>
          </div>

          {(title || body) && (
            <div className="rounded-xl border border-dashed border-[#4E9F87]/40 bg-[#4E9F87]/5 p-4">
              <p className="text-[10px] font-semibold text-[#4E9F87] mb-2 uppercase tracking-wide">Pré-visualização</p>
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

          {lastResult && (
            <div className={cn(
              "flex items-center gap-3 rounded-xl p-3.5 border",
              lastResult.sent > 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
            )}>
              {lastResult.sent > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              )}
              <div>
                <p className={cn("text-sm font-semibold", lastResult.sent > 0 ? "text-green-700" : "text-amber-700")}>
                  {lastResult.sent > 0 ? `${lastResult.sent} dispositivo(s) notificado(s)` : "Nenhum dispositivo ativo"}
                </p>
                <p className={cn("text-xs mt-0.5", lastResult.sent > 0 ? "text-green-600" : "text-amber-600")}>
                  {lastResult.message || (lastResult.sent === 0 ? "Os pacientes precisam ativar as notificações." : "Notificação enviada!")}
                </p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={sendMutation.isPending || !title.trim() || !body.trim() || (target !== "all" && selectedUserIds.length === 0)}
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
                {target === "all" 
                  ? "Enviar para Todos" 
                  : `Enviar para ${selectedUserIds.length} selecionado(s)`}
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-xs text-gray-500"
            onClick={() => setLocation("/reports/notifications")}
          >
            Ver relatório de adesão
          </Button>
        </form>
      </div>
    </MobileLayout>
  );
}

function FilterButton({ active, onClick, icon: Icon, label, color }: any) {
  const colors: any = {
    green: active ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:border-green-200",
    red: active ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-red-200",
    amber: active ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-600 hover:border-amber-200",
  };

  const iconColors: any = {
    green: active ? "text-green-500" : "text-gray-400",
    red: active ? "text-red-500" : "text-gray-400",
    amber: active ? "text-amber-500" : "text-gray-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
        colors[color]
      )}
    >
      <div className={cn("p-1.5 rounded-lg bg-white shadow-sm border border-gray-100", iconColors[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
