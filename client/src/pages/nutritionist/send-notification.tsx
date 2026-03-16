// ARQUIVO: ./client/src/pages/nutritionist/send-notification.tsx
// Página para o nutricionista enviar notificações push personalizadas - VERSÃO FINAL ESTABILIZADA COM NAVEGAÇÃO MELHORADA

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Send, Users, CheckCircle2, AlertCircle, Loader2, Search, Calendar, XCircle, CheckSquare, Square, ChevronLeft } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [isSelectingAll, setIsSelectingAll] = useState(false);

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

  // Filtros - Lógica de filtragem pura e simples
  const filteredPatients = useMemo(() => {
    let result = patientsWithApp;

    if (searchTerm && searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => {
        const name = (p.patientName || "").toLowerCase();
        const email = (p.patientEmail || "").toLowerCase();
        return name.includes(lowerSearch) || email.includes(lowerSearch);
      });
    }

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

  // Handlers Manuais - Única forma de alterar estado (Sem useEffect)
  
  // SELECIONAR TODOS - VERSÃO ASSÍNCRONA ULTRA-SEGURA (Evita Error #185)
  const handleSelectAll = useCallback(() => {
    setIsSelectingAll(true);
    
    // Pequeno atraso para o React processar o estado de carregamento e respirar
    setTimeout(() => {
      const ids = filteredPatients
        .map(p => p.userId)
        .filter((id): id is string => !!id);
      
      setSelectedUserIds([...ids]);
      setIsSelectingAll(false);
      
      toast({
        title: "Seleção concluída",
        description: `${ids.length} paciente(s) selecionado(s) com sucesso.`,
      });
    }, 100);
  }, [filteredPatients, toast]);

  const handleClearSelection = useCallback(() => {
    setSelectedUserIds([]);
  }, []);

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
    setSelectedUserIds([]);
  }, []);

  const handleTargetChange = useCallback((newTarget: "all" | "selection" | "filter") => {
    setTarget(newTarget);
    setSelectedUserIds([]);
    setSearchTerm("");
    setActiveFilter("all");
  }, []);

  const togglePatientSelection = useCallback((userId: string | null) => {
    if (!userId) return;
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  }, []);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { title, body };
      if (target !== "all") {
        if (selectedUserIds.length === 0) throw new Error("Selecione destinatários.");
        payload.targetUserIds = selectedUserIds;
      }
      const res = await apiRequest("POST", "/api/push/send-message", payload);
      if (!res.ok) throw new Error("Falha ao enviar.");
      return res.json();
    },
    onSuccess: (data) => {
      setLastResult(data);
      setTitle("");
      setBody("");
      setSelectedUserIds([]);
      toast({ title: "Sucesso!", description: "Notificação enviada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return (
    <MobileLayout title="Enviar Notificação" showBackButton>
      <div className="px-4 pb-8 pt-2 space-y-5">
        {/* BOTÃO DE VOLTAR PARA DESKTOP/MOBILE MELHORADO */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-500 hover:text-[#4E9F87] transition-colors flex items-center gap-1 -ml-2"
            onClick={() => setLocation("/")}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs font-medium">Voltar para o Painel</span>
          </Button>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-sm bg-[#4E9F87] p-4 flex items-center gap-4">
          <Bell className="h-6 w-6 text-white" />
          <div>
            <p className="text-white font-bold text-sm">Notificações Push</p>
            <p className="text-white/80 text-xs">Comunique-se com seus pacientes.</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(); }} className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <Tabs value={target} onValueChange={(v: any) => handleTargetChange(v)} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                <TabsTrigger value="selection" className="text-xs">Seleção</TabsTrigger>
                <TabsTrigger value="filter" className="text-xs">Filtros</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <p className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
                  Enviando para {patientsWithApp.length} pacientes ativos no app.
                </p>
              </TabsContent>

              <TabsContent value="selection" className="mt-0 space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-9 h-9 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-gray-400">{selectedUserIds.length} SELECIONADO(S)</span>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="h-6 text-[10px] px-2 text-[#4E9F87]" 
                      onClick={handleSelectAll}
                      disabled={isSelectingAll || filteredPatients.length === 0}
                    >
                      {isSelectingAll ? "Processando..." : "Selecionar Todos"}
                    </Button>
                    <Button type="button" variant="ghost" className="h-6 text-[10px] px-2 text-red-500" onClick={handleClearSelection}>Limpar</Button>
                  </div>
                </div>

                <div className="h-[250px] rounded-md border border-gray-100 p-2 overflow-y-auto bg-gray-50/30">
                  {reportLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto mt-10" /> : (
                    <div className="space-y-1">
                      {filteredPatients.map((p) => {
                        const isSelected = !!p.userId && selectedUserIds.includes(p.userId);
                        return (
                          <div 
                            key={p.patientId} 
                            className={cn(
                              "flex items-center space-x-3 p-2.5 rounded-lg border border-transparent transition-all cursor-pointer",
                              isSelected ? "bg-white border-[#4E9F87] shadow-sm" : "hover:bg-white/50"
                            )} 
                            onClick={() => togglePatientSelection(p.userId)}
                          >
                            <div className={cn(
                              "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                              isSelected ? "bg-[#4E9F87] border-[#4E9F87]" : "border-gray-300 bg-white"
                            )}>
                              {isSelected ? <CheckSquare className="h-3.5 w-3.5 text-white" /> : <Square className="h-3.5 w-3.5 text-gray-200" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate text-gray-700">{p.patientName}</p>
                              <p className="text-[10px] text-gray-400 truncate">{p.patientEmail}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="filter" className="mt-0 space-y-3">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Selecione um filtro para ver os pacientes:</p>
                <div className="grid gap-2">
                  <FilterBtn active={activeFilter === "active"} label="Plano Ativo" icon={CheckCircle2} onClick={() => handleFilterChange("active")} color="green" />
                  <FilterBtn active={activeFilter === "inactive"} label="Inativos" icon={XCircle} onClick={() => handleFilterChange("inactive")} color="red" />
                  <FilterBtn active={activeFilter === "expiring"} label="Vencendo" icon={Calendar} onClick={() => handleFilterChange("expiring")} color="amber" />
                </div>
                
                <Button 
                  type="button" 
                  className="w-full h-9 text-xs bg-[#4E9F87] hover:bg-[#3d8a74] text-white mt-2" 
                  onClick={handleSelectAll}
                  disabled={isSelectingAll || filteredPatients.length === 0}
                >
                  {isSelectingAll ? "Processando..." : `Selecionar Filtrados (${filteredPatients.length})`}
                </Button>
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
                className="text-sm h-11"
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
                className="text-sm resize-none min-h-[100px]"
              />
              <p className="text-right text-[10px] text-gray-400">{body.length}/300</p>
            </div>
          </div>

          {(title || body) && (
            <div className="rounded-xl border border-dashed border-[#4E9F87]/40 bg-[#4E9F87]/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
            className="w-full h-12 text-sm font-semibold bg-[#4E9F87] hover:bg-[#3d8a74] text-white rounded-xl shadow-md"
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

function FilterBtn({ active, label, icon: Icon, onClick, color }: any) {
  const styles: any = {
    green: active ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600",
    red: active ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600",
    amber: active ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-600",
  };
  return (
    <button type="button" onClick={onClick} className={cn("flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left", styles[color])}>
      <Icon className="h-4 w-4" />
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}
