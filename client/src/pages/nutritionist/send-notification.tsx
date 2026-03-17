// ARQUIVO: ./client/src/pages/nutritionist/send-notification.tsx
// Página para o nutricionista enviar notificações push personalizadas
// com suporte a modelos (templates) reutilizáveis de título e mensagem.

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Bell, Send, CheckCircle2, AlertCircle, Loader2, Search,
  Calendar, XCircle, CheckSquare, Square, ChevronLeft,
  ClipboardList, Plus, Trash2, Pencil, Check,
} from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// ─── Interfaces ────────────────────────────────────────────────────────────────

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

interface NotificationTemplate {
  id: string;
  nutritionistId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Componente Principal ──────────────────────────────────────────────────────

export default function SendNotificationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estado do formulário de envio
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "selection" | "filter">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [lastResult, setLastResult] = useState<{ sent: number; message: string } | null>(null);
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  // Estado da aba principal (envio vs modelos)
  const [mainTab, setMainTab] = useState<"send" | "templates">("send");

  // Estado do modal de criar/editar modelo
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  // Estado do diálogo de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<NotificationTemplate | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: reportData, isLoading: reportLoading } = useQuery<NotificationReportResponse>({
    queryKey: ["/api/push/report"],
    queryFn: async () => {
      const res = await fetch("/api/push/report", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar relatório.");
      return res.json();
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<NotificationTemplate[]>({
    queryKey: ["/api/notification-templates"],
    queryFn: async () => {
      const res = await fetch("/api/notification-templates", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar modelos.");
      return res.json();
    },
  });

  // ─── Memos ──────────────────────────────────────────────────────────────────

  const patients = useMemo(() => {
    if (!reportData?.report || !Array.isArray(reportData.report)) return [];
    return reportData.report;
  }, [reportData]);

  const patientsWithApp = useMemo(() => {
    return patients.filter(p => p && p.hasAccount && p.userId);
  }, [patients]);

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

  // ─── Handlers de Seleção de Pacientes ───────────────────────────────────────

  const handleSelectAll = useCallback(() => {
    setIsSelectingAll(true);
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

  // ─── Mutation: Enviar Notificação ────────────────────────────────────────────

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

  // ─── Mutation: Criar Modelo ──────────────────────────────────────────────────

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { title: string; body: string }) => {
      const res = await apiRequest("POST", "/api/notification-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
      setTemplateModalOpen(false);
      setTemplateTitle("");
      setTemplateBody("");
      toast({ title: "Modelo salvo!", description: "O modelo foi criado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // ─── Mutation: Editar Modelo ─────────────────────────────────────────────────

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; body: string }) => {
      const res = await apiRequest("PATCH", `/api/notification-templates/${data.id}`, {
        title: data.title,
        body: data.body,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
      setTemplateModalOpen(false);
      setEditingTemplate(null);
      setTemplateTitle("");
      setTemplateBody("");
      toast({ title: "Modelo atualizado!", description: "As alterações foram salvas." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // ─── Mutation: Excluir Modelo ────────────────────────────────────────────────

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/notification-templates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      toast({ title: "Modelo excluído.", description: "O modelo foi removido." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // ─── Handlers de Modelos ─────────────────────────────────────────────────────

  const openCreateTemplateModal = useCallback(() => {
    setEditingTemplate(null);
    setTemplateTitle("");
    setTemplateBody("");
    setTemplateModalOpen(true);
  }, []);

  const openEditTemplateModal = useCallback((template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateTitle(template.title);
    setTemplateBody(template.body);
    setTemplateModalOpen(true);
  }, []);

  const handleSaveTemplate = useCallback(() => {
    if (!templateTitle.trim() || !templateBody.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha o título e a mensagem.", variant: "destructive" });
      return;
    }
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, title: templateTitle, body: templateBody });
    } else {
      createTemplateMutation.mutate({ title: templateTitle, body: templateBody });
    }
  }, [editingTemplate, templateTitle, templateBody, createTemplateMutation, updateTemplateMutation, toast]);

  const handleUseTemplate = useCallback((template: NotificationTemplate) => {
    setTitle(template.title);
    setBody(template.body);
    setMainTab("send");
    toast({
      title: "Modelo aplicado!",
      description: "Título e mensagem preenchidos. Revise e envie.",
    });
  }, [toast]);

  const handleConfirmDelete = useCallback((template: NotificationTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  }, []);

  const isSavingTemplate = createTemplateMutation.isPending || updateTemplateMutation.isPending;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <MobileLayout title="Notificações" showBackButton>
      <div className="px-4 pb-8 pt-2 space-y-5">

        {/* Botão Voltar */}
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

        {/* Banner */}
        <div className="rounded-2xl overflow-hidden shadow-sm bg-[#4E9F87] p-4 flex items-center gap-4">
          <Bell className="h-6 w-6 text-white" />
          <div>
            <p className="text-white font-bold text-sm">Notificações Push</p>
            <p className="text-white/80 text-xs">Comunique-se com seus pacientes.</p>
          </div>
        </div>

        {/* Abas Principais: Enviar / Modelos */}
        <Tabs value={mainTab} onValueChange={(v: any) => setMainTab(v)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="send" className="text-xs flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Enviar
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Modelos
              {templates.length > 0 && (
                <span className="ml-1 bg-[#4E9F87] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {templates.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Aba: Enviar ─────────────────────────────────────────────────── */}
          <TabsContent value="send" className="mt-4 space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(); }} className="space-y-4">

              {/* Seleção de destinatários */}
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

              {/* Conteúdo da Notificação */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#4E9F87]" />
                    <Label className="text-sm font-semibold text-gray-700">Conteúdo da Notificação</Label>
                  </div>
                  {/* Botão de acesso rápido a modelos */}
                  {templates.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2.5 border-[#4E9F87]/40 text-[#4E9F87] hover:bg-[#4E9F87]/5 flex items-center gap-1"
                      onClick={() => setMainTab("templates")}
                    >
                      <ClipboardList className="h-3 w-3" />
                      Usar modelo
                    </Button>
                  )}
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

                {/* Botão salvar como modelo */}
                {(title.trim() || body.trim()) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-[11px] text-[#4E9F87] border border-dashed border-[#4E9F87]/40 hover:bg-[#4E9F87]/5 flex items-center gap-1.5 mt-1"
                    onClick={() => {
                      setTemplateTitle(title);
                      setTemplateBody(body);
                      setEditingTemplate(null);
                      setTemplateModalOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Salvar como modelo
                  </Button>
                )}
              </div>

              {/* Pré-visualização */}
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

              {/* Resultado do envio */}
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

              {/* Botão Enviar */}
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
          </TabsContent>

          {/* ── Aba: Modelos ─────────────────────────────────────────────────── */}
          <TabsContent value="templates" className="mt-4 space-y-4">

            {/* Cabeçalho da aba de modelos */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Meus Modelos</p>
                <p className="text-xs text-gray-500">Crie e reutilize mensagens prontas.</p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-9 text-xs bg-[#4E9F87] hover:bg-[#3d8a74] text-white flex items-center gap-1.5"
                onClick={openCreateTemplateModal}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Modelo
              </Button>
            </div>

            {/* Lista de modelos */}
            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#4E9F87]" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
<div className="w-14 h-14 rounded-full bg-[#4E9F87]/10 flex items-center justify-center">
                <ClipboardList className="h-7 w-7 text-[#4E9F87]/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Nenhum modelo salvo</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
                    Crie modelos para agilizar o envio de notificações recorrentes.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 text-xs bg-[#4E9F87] hover:bg-[#3d8a74] text-white flex items-center gap-1.5 mt-2"
                  onClick={openCreateTemplateModal}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Criar primeiro modelo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onEdit={openEditTemplateModal}
                    onDelete={handleConfirmDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Modal: Criar / Editar Modelo ──────────────────────────────────────── */}
      <Dialog open={templateModalOpen} onOpenChange={(open) => {
        if (!open) {
          setTemplateModalOpen(false);
          setEditingTemplate(null);
          setTemplateTitle("");
          setTemplateBody("");
        }
      }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-800">
              {editingTemplate ? "Editar Modelo" : "Novo Modelo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tmpl-title" className="text-xs text-gray-500 font-medium">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tmpl-title"
                placeholder="Ex: Lembrete de hidratação"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                maxLength={100}
                className="text-sm h-10"
              />
              <p className="text-right text-[10px] text-gray-400">{templateTitle.length}/100</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-body" className="text-xs text-gray-500 font-medium">
                Mensagem <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="tmpl-body"
                placeholder="Ex: Lembre-se de beber pelo menos 2L de água hoje!"
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                maxLength={300}
                rows={4}
                className="text-sm resize-none"
              />
              <p className="text-right text-[10px] text-gray-400">{templateBody.length}/300</p>
            </div>

            {/* Pré-visualização no modal */}
            {(templateTitle || templateBody) && (
              <div className="rounded-xl border border-dashed border-[#4E9F87]/40 bg-[#4E9F87]/5 p-3">
                <p className="text-[9px] font-semibold text-[#4E9F87] mb-1.5 uppercase tracking-wide">Pré-visualização</p>
                <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100">
                  <div className="flex items-start gap-2">
                    <img src="/icon-72x72.png" alt="DiNutri" className="w-7 h-7 rounded-md shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 leading-tight">{templateTitle || "Título"}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{templateBody || "Mensagem..."}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="flex-1 h-10 text-sm" disabled={isSavingTemplate}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="flex-1 h-10 text-sm bg-[#4E9F87] hover:bg-[#3d8a74] text-white"
              onClick={handleSaveTemplate}
              disabled={isSavingTemplate || !templateTitle.trim() || !templateBody.trim()}
            >
              {isSavingTemplate ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
              ) : (
                <><Check className="h-4 w-4 mr-2" />{editingTemplate ? "Salvar alterações" : "Salvar modelo"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: Confirmar Exclusão ───────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              O modelo <span className="font-semibold text-gray-700">"{templateToDelete?.title}"</span> será excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="flex-1 h-10 text-sm" disabled={deleteTemplateMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 h-10 text-sm bg-red-500 hover:bg-red-600 text-white"
              onClick={() => templateToDelete && deleteTemplateMutation.mutate(templateToDelete.id)}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Excluindo...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />Excluir</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
}

// ─── Componente: Card de Modelo ────────────────────────────────────────────────

interface TemplateCardProps {
  template: NotificationTemplate;
  onUse: (template: NotificationTemplate) => void;
  onEdit: (template: NotificationTemplate) => void;
  onDelete: (template: NotificationTemplate) => void;
}

function TemplateCard({ template, onUse, onEdit, onDelete }: TemplateCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Conteúdo do card */}
      <div className="p-4 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800 leading-tight flex-1">{template.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(template)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#4E9F87] hover:bg-[#4E9F87]/10 transition-colors"
              title="Editar modelo"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(template)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Excluir modelo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{template.body}</p>
      </div>

      {/* Rodapé com botão de usar */}
      <div className="px-4 pb-3">
        <Button
          type="button"
          size="sm"
          className="w-full h-8 text-xs bg-[#4E9F87] hover:bg-[#3d8a74] text-white flex items-center gap-1.5"
          onClick={() => onUse(template)}
        >
          <Send className="h-3 w-3" />
          Usar este modelo
        </Button>
      </div>
    </div>
  );
}

// ─── Componente: Botão de Filtro ───────────────────────────────────────────────

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
