// ARQUIVO: ./client/src/pages/nutritionist/send-notification.tsx
// Página para o nutricionista enviar notificações push personalizadas - VERSÃO ULTRA-ESTÁVEL

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Send, Users, CheckCircle2, AlertCircle, Loader2, Search, Calendar, XCircle } from "lucide-react";
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
  const handleSelectAll = useCallback(() => {
    const ids = filteredPatients
      .map(p => p.userId)
      .filter((id): id is string => !!id);
    
    // Atualização atômica para evitar loops
    setSelectedUserIds([...ids]);
  }, [filteredPatients]);

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
                    <Button type="button" variant="ghost" className="h-6 text-[10px] px-2" onClick={handleSelectAll}>Selecionar Todos</Button>
                    <Button type="button" variant="ghost" className="h-6 text-[10px] px-2 text-red-500" onClick={handleClearSelection}>Limpar</Button>
                  </div>
                </div>

                {/* SUBSTITUIÇÃO DO ScrollArea POR DIV NATIVA COM OVERFLOW PARA EVITAR LOOPS DE REDIMENSIONAMENTO */}
                <div className="h-[200px] rounded-md border border-gray-100 p-2 overflow-y-auto">
                  {reportLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto mt-10" /> : (
                    <div className="space-y-1">
                      {filteredPatients.map((p) => {
                        const isSelected = !!p.userId && selectedUserIds.includes(p.userId);
                        return (
                          <div 
                            key={p.patientId} 
                            className={cn(
                              "flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer",
                              isSelected && "bg-[#4E9F87]/5"
                            )} 
                            onClick={() => togglePatientSelection(p.userId)}
                          >
                            {/* SUBSTITUIÇÃO DO Checkbox POR INPUT HTML NATIVO PARA EVITAR CONFLITOS DE ESTADO */}
                            <input 
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-[#4E9F87] focus:ring-[#4E9F87]"
                              checked={isSelected} 
                              onChange={() => {}} // O clique no pai já lida com a seleção
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{p.patientName}</p>
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
                <div className="grid gap-2">
                  <FilterBtn active={activeFilter === "active"} label="Plano Ativo" icon={CheckCircle2} onClick={() => handleFilterChange("active")} color="green" />
                  <FilterBtn active={activeFilter === "inactive"} label="Inativos" icon={XCircle} onClick={() => handleFilterChange("inactive")} color="red" />
                  <FilterBtn active={activeFilter === "expiring"} label="Vencendo" icon={Calendar} onClick={() => handleFilterChange("expiring")} color="amber" />
                </div>
                <Button type="button" className="w-full h-9 text-xs" onClick={handleSelectAll}>Selecionar Filtrados ({filteredPatients.length})</Button>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-3">
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm" />
            <Textarea placeholder="Mensagem" value={body} onChange={(e) => setBody(e.target.value)} className="text-sm" />
          </div>

          <Button type="submit" disabled={sendMutation.isPending} className="w-full h-12 bg-[#4E9F87] hover:bg-[#3d8a74] text-white font-bold rounded-xl">
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Notificação"}
          </Button>
        </form>
      </div>
    </MobileLayout>
  );
}

function FilterBtn({ active, label, icon: Icon, onClick, color }: any) {
  const styles: any = {
    green: active ? "border-green-500 bg-green-50" : "border-gray-200",
    red: active ? "border-red-500 bg-red-50" : "border-gray-200",
    amber: active ? "border-amber-500 bg-amber-50" : "border-gray-200",
  };
  return (
    <button type="button" onClick={onClick} className={cn("flex items-center gap-3 p-3 rounded-xl border-2 transition-all", styles[color])}>
      <Icon className="h-4 w-4" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
