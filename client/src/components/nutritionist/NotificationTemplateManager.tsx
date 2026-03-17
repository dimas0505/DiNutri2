import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Save, X, Loader2, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { NotificationTemplate } from "@shared/schema";

interface NotificationTemplateManagerProps {
  onSelectTemplate?: (template: NotificationTemplate) => void;
}

export function NotificationTemplateManager({ onSelectTemplate }: NotificationTemplateManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: templates = [], isLoading } = useQuery<NotificationTemplate[]>({
    queryKey: ["/api/notifications/templates"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/templates", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar modelos.");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; title: string; body: string }) => {
      const res = await apiRequest("POST", "/api/notifications/templates", data);
      if (!res.ok) throw new Error("Falha ao criar modelo.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/templates"] });
      resetForm();
      setIsAdding(false);
      toast({ title: "Sucesso", description: "Modelo salvo com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; title: string; body: string }) => {
      const res = await apiRequest("PUT", `/api/notifications/templates/${data.id}`, {
        name: data.name,
        title: data.title,
        body: data.body,
      });
      if (!res.ok) throw new Error("Falha ao atualizar modelo.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/templates"] });
      resetForm();
      setEditingId(null);
      toast({ title: "Sucesso", description: "Modelo atualizado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/notifications/templates/${id}`);
      if (!res.ok) throw new Error("Falha ao remover modelo.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/templates"] });
      toast({ title: "Sucesso", description: "Modelo removido." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setTitle("");
    setBody("");
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingId(template.id);
    setName(template.name);
    setTitle(template.title);
    setBody(template.body);
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim() || !body.trim()) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, name, title, body });
    } else {
      createMutation.mutate({ name, title, body });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#4E9F87]" />
          Modelos de Mensagem
        </h3>
        {!isAdding && !editingId && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs border-[#4E9F87] text-[#4E9F87] hover:bg-[#4E9F87]/5"
            onClick={() => { resetForm(); setIsAdding(true); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Novo Modelo
          </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="bg-[#4E9F87]/5 border border-[#4E9F87]/20 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#4E9F87] uppercase tracking-wider">
              {editingId ? "Editando Modelo" : "Novo Modelo"}
            </span>
            <button 
              type="button" 
              onClick={() => { setEditingId(null); setIsAdding(false); resetForm(); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500 uppercase">Nome do Modelo (Interno)</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ex: Lembrete de Água" 
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500 uppercase">Título da Notificação</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="O que o paciente verá" 
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500 uppercase">Mensagem</Label>
            <Textarea 
              value={body} 
              onChange={(e) => setBody(e.target.value)} 
              placeholder="Conteúdo da mensagem" 
              className="text-xs min-h-[80px] resize-none"
              required
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button 
              type="submit" 
              size="sm" 
              className="flex-1 h-9 bg-[#4E9F87] hover:bg-[#3d8a74] text-white text-xs font-bold"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Salvar Modelo
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="h-9 text-xs text-gray-500"
              onClick={() => { setEditingId(null); setIsAdding(false); resetForm(); }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-2">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-xs text-gray-400">Nenhum modelo salvo ainda.</p>
          </div>
        ) : (
          templates.map((template) => (
            <div 
              key={template.id} 
              className="group relative bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:border-[#4E9F87]/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelectTemplate?.(template)}
                >
                  <p className="text-xs font-bold text-gray-800 truncate">{template.name}</p>
                  <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{template.title}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    type="button"
                    onClick={() => handleEdit(template)}
                    className="p-1.5 text-gray-400 hover:text-[#4E9F87] hover:bg-[#4E9F87]/5 rounded-md transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm("Deseja realmente excluir este modelo?")) {
                        deleteMutation.mutate(template.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              
              {onSelectTemplate && (
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template)}
                  className="mt-2 w-full py-1.5 bg-gray-50 hover:bg-[#4E9F87]/10 text-[10px] font-bold text-gray-600 hover:text-[#4E9F87] rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="h-3 w-3" />
                  Usar este modelo
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
