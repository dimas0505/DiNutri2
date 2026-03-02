import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, Eye, FileText, Plus, Users, XCircle,
  Copy, History, User, Calendar, Ruler, Weight, Target, Activity,
  Heart, Stethoscope, Pill, Camera, Image, Smile, Trash2, FileDown,
  CreditCard, Upload, Download, ClipboardList, Pencil,
  Dumbbell, BookOpen, ChevronRight, Percent,
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { AnamnesisNutritionistDataForm } from "@/components/nutritionist/anamnesis-nutritionist-data-form";
import { generatePrescriptionPDF } from "@/utils/pdf-generator";
import { calculateDurninBodyFat, calculateAgeFromBirthDate } from "@/utils/durnin-body-fat";
import { cn } from "@/lib/utils";
import type {
  Patient, Prescription, AnamnesisRecord, FoodDiaryEntryWithPrescription,
  MealData, MoodType, Subscription, PatientDocument, AnthropometricAssessment,
} from "@shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

type SidebarSection =
  | "perfil"
  | "anamnese"
  | "historico"
  | "antropometria"
  | "prescricoes"
  | "assinatura"
  | "avaliacoes"
  | "diario";

interface NavItem {
  id: SidebarSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "perfil",        label: "Perfil do Paciente",      icon: User,          description: "Dados pessoais e acesso" },
  { id: "anamnese",      label: "Anamnese Nutricional",    icon: Stethoscope,   description: "Dados clínicos atuais" },
  { id: "historico",     label: "Histórico de Anamnese",   icon: History,       description: "Registros anteriores" },
  { id: "antropometria", label: "Antropometria",           icon: Dumbbell,      description: "Medidas e avaliações" },
  { id: "prescricoes",   label: "Prescrições",             icon: FileText,      description: "Planos alimentares" },
  { id: "assinatura",    label: "Assinatura / Plano",      icon: CreditCard,    description: "Gerenciar plano" },
  { id: "avaliacoes",    label: "Avaliações",              icon: ClipboardList, description: "Documentos anexados" },
  { id: "diario",        label: "Diário Alimentar",        icon: BookOpen,      description: "Fotos e registros" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PatientDetails({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── UI State ──
  const [activeSection, setActiveSection] = useState<SidebarSection>("perfil");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Feature State ──
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<string | null>(null);
  const [followUpLink, setFollowUpLink] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isCreateSubscriptionDialogOpen, setIsCreateSubscriptionDialogOpen] = useState(false);
  const [isEditSubscriptionDialogOpen, setIsEditSubscriptionDialogOpen] = useState(false);
  const [newSubscriptionPlanType, setNewSubscriptionPlanType] = useState<Subscription["planType"]>("monthly");
  const [newSubscriptionStatus, setNewSubscriptionStatus] = useState<Subscription["status"]>("active");
  const [newSubscriptionExpiresAt, setNewSubscriptionExpiresAt] = useState<string>("");
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnthroDialogOpen, setIsAnthroDialogOpen] = useState(false);
  const [anthroToEdit, setAnthroToEdit] = useState<AnthropometricAssessment | null>(null);
  const [anthroToDelete, setAnthroToDelete] = useState<string | null>(null);
  const [isAnthroViewOpen, setIsAnthroViewOpen] = useState(false);
  const [anthroToView, setAnthroToView] = useState<AnthropometricAssessment | null>(null);
  const [anthroForm, setAnthroForm] = useState({
    title: "",
    weightKg: "",
    circumNeck: "", circumChest: "", circumWaist: "",
    circumAbdomen: "", circumHip: "",
    circumNonDominantArmRelaxed: "", circumNonDominantArmContracted: "",
    circumNonDominantProximalThigh: "", circumNonDominantCalf: "",
    foldBiceps: "", foldTriceps: "", foldSubscapular: "", foldSuprailiac: "",
  });

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", params.id],
  });

  const { data: currentSubscription } = useQuery<Subscription>({
    queryKey: ["/api/patients", params.id, "subscription"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/patients/${params.id}/subscription`);
      return await response.json();
    },
    enabled: !!patient,
  });

  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery<Prescription[]>({
    queryKey: ["/api/patients", params.id, "prescriptions"],
    enabled: !!patient,
  });

  const { data: anamnesisHistory, isLoading: historyLoading } = useQuery<AnamnesisRecord[]>({
    queryKey: ["/api/patients", params.id, "anamnesis-records"],
    enabled: !!patient,
  });

  const { data: anthroAssessments, isLoading: anthroLoading } = useQuery<AnthropometricAssessment[]>({
    queryKey: ["/api/patients", params.id, "anthropometry"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/patients/${params.id}/anthropometry`);
      return response.json();
    },
    enabled: !!patient,
  });

  const { data: foodDiaryEntries, isLoading: foodDiaryLoading } = useQuery<FoodDiaryEntryWithPrescription[]>({
    queryKey: ["/api/patients", params.id, "food-diary", "entries"],
    enabled: !!patient,
  });

  const { data: patientDocuments, isLoading: documentsLoading } = useQuery<PatientDocument[]>({
    queryKey: ["/api/patients", params.id, "assessments"],
    enabled: !!patient,
  });

  const { data: nutritionistSettings } = useQuery({
    queryKey: ["/api/nutritionist/settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/nutritionist/settings");
      return response.json();
    },
  });

  // ─── Derived State ────────────────────────────────────────────────────────

  const currentAnamnesisRecord = anamnesisHistory && anamnesisHistory.length > 0
    ? anamnesisHistory[anamnesisHistory.length - 1]
    : null;

  const hasAccountLinked = !!patient?.userId;

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createInitialAnamnesisRecord = useMutation({
    mutationFn: async () => {
      if (!patient) throw new Error("Patient not found");
      const initialRecord = {
        patientId: patient.id,
        weightKg: patient.weightKg,
        notes: patient.notes,
        goal: patient.goal,
        activityLevel: patient.activityLevel,
        likedHealthyFoods: patient.likedHealthyFoods,
        dislikedFoods: patient.dislikedFoods,
        hasIntolerance: patient.hasIntolerance,
        intolerances: patient.intolerances,
        canEatMorningSolids: patient.canEatMorningSolids,
        mealsPerDayCurrent: patient.mealsPerDayCurrent,
        mealsPerDayWilling: patient.mealsPerDayWilling,
        alcoholConsumption: patient.alcoholConsumption,
        supplements: patient.supplements,
        diseases: patient.diseases,
        medications: patient.medications,
        biotype: patient.biotype,
      };
      const response = await apiRequest("POST", `/api/patients/${patient.id}/anamnesis-records`, initialRecord);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "anamnesis-records"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao criar registro inicial de anamnese.", variant: "destructive" });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/patients/${params.id}/assessments`, { method: "POST", body: formData });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Falha ao enviar." }));
        throw new Error(err.message || "Falha ao enviar.");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Avaliação enviada com sucesso!" });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "assessments"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao enviar avaliação", description: error.message, variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("DELETE", `/api/assessments/${documentId}`);
      if (response.status !== 204) {
        const err = await response.json().catch(() => ({ message: "Falha ao excluir." }));
        throw new Error(err.message || "Falha ao excluir.");
      }
    },
    onSuccess: () => {
      toast({ title: "Avaliação excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "assessments"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir avaliação", description: error.message, variant: "destructive" });
    },
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      return fetch(`/api/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: params.id, title: "Nova Prescrição", expiresAt: expiresAt.toISOString() }),
      }).then((res) => {
        if (!res.ok) throw res;
        return res.json();
      });
    },
    onSuccess: (data) => {
      toast({ title: "Prescrição criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "prescriptions"] });
      setLocation(`/prescriptions/${data.id}/edit`);
    },
    onError: async (error: unknown) => {
      let errorDetails = "Não foi possível obter os detalhes do erro.";
      if (error instanceof Response) {
        try { errorDetails = JSON.stringify(await error.json(), null, 2); } catch { errorDetails = "Resposta inválida."; }
      }
      console.error("DETALHES DO ERRO DE VALIDAÇÃO:", errorDetails);
      toast({ title: "Erro ao criar prescrição", description: "O servidor rejeitou os dados. Verifique o console.", variant: "destructive" });
    },
  });

  const duplicatePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const title = `Cópia - ${new Date().toLocaleDateString("pt-BR")}`;
      const response = await apiRequest("POST", `/api/prescriptions/${prescriptionId}/duplicate`, { title });
      return await response.json();
    },
    onSuccess: (prescription) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "prescriptions"] });
      setLocation(`/prescriptions/${prescription.id}/edit`);
    },
    onError: () => toast({ title: "Erro", description: "Falha ao duplicar prescrição.", variant: "destructive" }),
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const response = await apiRequest("DELETE", `/api/prescriptions/${prescriptionId}`);
      if (response.status === 204) return null;
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Prescrição excluída", description: "A prescrição foi excluída com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "prescriptions"] });
      setPrescriptionToDelete(null);
    },
    onError: (error: any) => {
      const msg = error.message?.includes("403")
        ? "Não é possível excluir prescrições publicadas."
        : "Não foi possível excluir a prescrição. Tente novamente.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
      setPrescriptionToDelete(null);
    },
  });

  const requestFollowUpMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/patients/${params.id}/request-follow-up`),
    onSuccess: async (res) => {
      const { followUpUrl } = await res.json();
      setFollowUpLink(followUpUrl);
    },
    onError: () => toast({ title: "Erro", description: "Falha ao gerar link de anamnese de retorno.", variant: "destructive" }),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (entryId: string) => fetch(`/api/food-diary/entries/${entryId}/photo`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Entrada do diário excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "food-diary", "entries"] });
    },
    onError: () => toast({ title: "Erro ao excluir a entrada do diário", variant: "destructive" }),
    onSettled: () => setEntryToDelete(null),
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ planType, status, expiresAt }: { planType: Subscription["planType"]; status: Subscription["status"]; expiresAt?: string }) => {
      const response = await apiRequest("POST", `/api/nutritionist/patients/${params.id}/subscription`, { planType, status, expiresAt });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Assinatura criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "subscription"] });
      setIsCreateSubscriptionDialogOpen(false);
      setNewSubscriptionExpiresAt("");
    },
    onError: () => toast({ title: "Erro", description: "Falha ao criar assinatura.", variant: "destructive" }),
  });

  const editSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionId, planType, status, expiresAt }: { subscriptionId: string; planType: Subscription["planType"]; status: Subscription["status"]; expiresAt?: string }) => {
      const response = await apiRequest("PATCH", `/api/subscriptions/${subscriptionId}/manage`, { planType, status, expiresAt });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Assinatura editada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "subscription"] });
      setIsEditSubscriptionDialogOpen(false);
      setNewSubscriptionExpiresAt("");
    },
    onError: () => toast({ title: "Erro", description: "Falha ao editar assinatura.", variant: "destructive" }),
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await apiRequest("DELETE", `/api/subscriptions/${subscriptionId}`);
      if (response.status === 204) return null;
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Assinatura excluída", description: "A assinatura foi excluída com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "subscription"] });
      setSubscriptionToDelete(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir a assinatura.", variant: "destructive" });
      setSubscriptionToDelete(null);
    },
  });

  const createAnthroMutation = useMutation({
    mutationFn: async (data: Omit<AnthropometricAssessment, "id" | "nutritionistId" | "createdAt" | "updatedAt">) => {
      const response = await apiRequest("POST", `/api/patients/${params.id}/anthropometry`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "anthropometry"] });
      setIsAnthroDialogOpen(false);
      setAnthroToEdit(null);
      toast({ title: "Sucesso", description: "Avaliação antropométrica salva." });
    },
    onError: () => toast({ title: "Erro", description: "Falha ao salvar avaliação.", variant: "destructive" }),
  });

  const updateAnthroMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnthropometricAssessment> }) => {
      const response = await apiRequest("PUT", `/api/anthropometry/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "anthropometry"] });
      setIsAnthroDialogOpen(false);
      setAnthroToEdit(null);
      toast({ title: "Sucesso", description: "Avaliação atualizada." });
    },
    onError: () => toast({ title: "Erro", description: "Falha ao atualizar avaliação.", variant: "destructive" }),
  });

  const deleteAnthroMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/anthropometry/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id, "anthropometry"] });
      setAnthroToDelete(null);
      toast({ title: "Sucesso", description: "Avaliação excluída." });
    },
    onError: () => toast({ title: "Erro", description: "Falha ao excluir avaliação.", variant: "destructive" }),
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit" });

  const renderStatusBadge = (status: Subscription["status"]) => {
    const map: Record<string, { label: string; className: string }> = {
      active: { label: "Ativo", className: "bg-green-100 text-green-800" },
      pending_payment: { label: "Aguardando Pagamento", className: "bg-yellow-100 text-yellow-800" },
      pending_approval: { label: "Aguardando Aprovação", className: "bg-blue-100 text-blue-800" },
      expired: { label: "Expirado", className: "bg-red-100 text-red-800" },
      canceled: { label: "Cancelado", className: "bg-gray-100 text-gray-800" },
    };
    const cfg = map[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={cfg.className}>{cfg.label}</Badge>;
  };

  const getPlanTypeLabel = (planType: Subscription["planType"]) =>
    ({ free: "Gratuito", monthly: "Mensal", quarterly: "Trimestral" }[planType] ?? planType);

  const getMoodEmoji = (mood: MoodType | null | undefined) => {
    if (!mood) return null;
    return { very_sad: "😢", sad: "😟", neutral: "😐", happy: "😊", very_happy: "😄" }[mood] ?? null;
  };

  const getMoodLabel = (mood: MoodType | null | undefined) => {
    if (!mood) return null;
    return { very_sad: "Muito triste", sad: "Triste", neutral: "Neutro", happy: "Feliz", very_happy: "Muito feliz" }[mood] ?? null;
  };

  function openAnthroDialog(prefill?: AnthropometricAssessment) {
    if (prefill) {
      setAnthroForm({
        title: prefill.title || "",
        weightKg: prefill.weightKg?.toString() ?? "",
        circumNeck: prefill.circumNeck?.toString() ?? "",
        circumChest: prefill.circumChest?.toString() ?? "",
        circumWaist: prefill.circumWaist?.toString() ?? "",
        circumAbdomen: prefill.circumAbdomen?.toString() ?? "",
        circumHip: prefill.circumHip?.toString() ?? "",
        circumNonDominantArmRelaxed: prefill.circumNonDominantArmRelaxed?.toString() ?? "",
        circumNonDominantArmContracted: prefill.circumNonDominantArmContracted?.toString() ?? "",
        circumNonDominantProximalThigh: prefill.circumNonDominantProximalThigh?.toString() ?? "",
        circumNonDominantCalf: prefill.circumNonDominantCalf?.toString() ?? "",
        foldBiceps: prefill.foldBiceps?.toString() ?? "",
        foldTriceps: prefill.foldTriceps?.toString() ?? "",
        foldSubscapular: prefill.foldSubscapular?.toString() ?? "",
        foldSuprailiac: prefill.foldSuprailiac?.toString() ?? "",
      });
      setAnthroToEdit(prefill);
    } else {
      setAnthroForm({ title: "", weightKg: "", circumNeck: "", circumChest: "", circumWaist: "", circumAbdomen: "", circumHip: "", circumNonDominantArmRelaxed: "", circumNonDominantArmContracted: "", circumNonDominantProximalThigh: "", circumNonDominantCalf: "", foldBiceps: "", foldTriceps: "", foldSubscapular: "", foldSuprailiac: "" });
      setAnthroToEdit(null);
    }
    setIsAnthroDialogOpen(true);
  }

  function submitAnthroForm() {
    const toNum = (v: string) => (v === "" ? null : parseFloat(v));
    const data = {
      patientId: params.id,
      title: anthroForm.title,
      weightKg: toNum(anthroForm.weightKg),
      circumNeck: toNum(anthroForm.circumNeck),
      circumChest: toNum(anthroForm.circumChest),
      circumWaist: toNum(anthroForm.circumWaist),
      circumAbdomen: toNum(anthroForm.circumAbdomen),
      circumHip: toNum(anthroForm.circumHip),
      circumNonDominantArmRelaxed: toNum(anthroForm.circumNonDominantArmRelaxed),
      circumNonDominantArmContracted: toNum(anthroForm.circumNonDominantArmContracted),
      circumNonDominantProximalThigh: toNum(anthroForm.circumNonDominantProximalThigh),
      circumNonDominantCalf: toNum(anthroForm.circumNonDominantCalf),
      foldBiceps: toNum(anthroForm.foldBiceps),
      foldTriceps: toNum(anthroForm.foldTriceps),
      foldSubscapular: toNum(anthroForm.foldSubscapular),
      foldSuprailiac: toNum(anthroForm.foldSuprailiac),
    };
    if (anthroToEdit) {
      updateAnthroMutation.mutate({ id: anthroToEdit.id, data });
    } else {
      createAnthroMutation.mutate(data as any);
    }
  }

  const handleEditSubscription = () => {
    if (currentSubscription) {
      setNewSubscriptionPlanType(currentSubscription.planType);
      setNewSubscriptionStatus(currentSubscription.status);
      if (currentSubscription.expiresAt) {
        const date = new Date(currentSubscription.expiresAt);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        setNewSubscriptionExpiresAt(`${y}-${m}-${d}`);
      } else {
        setNewSubscriptionExpiresAt("");
      }
      setIsEditSubscriptionDialogOpen(true);
    }
  };

  const handleDownloadPrescription = async (prescriptionId: string) => {
    const fullPrescription = prescriptions?.find((p: Prescription) => p.id === prescriptionId);
    if (patient && fullPrescription) {
      toast({ title: "Preparando o PDF...", description: "Seu download começará em breve." });
      try {
        await generatePrescriptionPDF({
          prescription: fullPrescription,
          patient,
          onSuccess: () => toast({ title: "PDF gerado com sucesso!", description: "O arquivo foi baixado." }),
          onError: (error) => {
            console.error("Error generating PDF:", error);
            toast({ title: "Erro ao gerar PDF", description: "Não foi possível gerar o PDF.", variant: "destructive" });
          },
        });
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ title: "Erro ao gerar PDF", description: "Não foi possível gerar o PDF.", variant: "destructive" });
      }
    } else {
      toast({ title: "Erro", description: "Não foi possível encontrar os dados da prescrição.", variant: "destructive" });
    }
  };

  // ─── Loading / Not Found ──────────────────────────────────────────────────

  if (patientLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Carregando..." />
        <main className="max-w-7xl mx-auto p-4 lg:p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Paciente não encontrado" showBack onBack={() => setLocation("/patients")} />
        <main className="max-w-7xl mx-auto p-4 lg:p-6">
          <p className="text-center text-muted-foreground">Paciente não encontrado.</p>
        </main>
      </div>
    );
  }

  // ─── Section Renderers ────────────────────────────────────────────────────

  function renderPerfil() {
    return (
      <div className="space-y-6">
        {/* Patient card */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white leading-tight">{patient.name}</h2>
              {patient.email && <p className="text-violet-200 text-sm mt-0.5 break-all">{patient.email}</p>}
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {patient.birthDate && (
                <InfoRow icon={<Calendar className="h-4 w-4 text-violet-500" />} label="Idade" value={`${calculateAge(patient.birthDate)} anos`} testId="text-patient-age" />
              )}
              {patient.sex && (
                <InfoRow icon={<User className="h-4 w-4 text-blue-500" />} label="Sexo" value={patient.sex === "F" ? "Feminino" : patient.sex === "M" ? "Masculino" : "Outro"} testId="text-patient-sex" />
              )}
              {patient.heightCm && (
                <InfoRow icon={<Ruler className="h-4 w-4 text-indigo-500" />} label="Altura" value={`${patient.heightCm} cm`} testId="text-patient-height" />
              )}
              {(() => {
                // Espelha o peso da última avaliação antropométrica; usa o cadastral como fallback
                const latestWeight = anthroAssessments && anthroAssessments.length > 0
                  ? anthroAssessments[0].weightKg
                  : null;
                const displayWeight = latestWeight ?? (patient.weightKg ? parseFloat(patient.weightKg) : null);
                const isFromAssessment = latestWeight != null;
                return displayWeight != null ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                    <div className="p-2 bg-fuchsia-100 rounded-lg">
                      <Weight className="h-4 w-4 text-fuchsia-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Peso</p>
                      <p className="text-sm font-semibold">{displayWeight} kg</p>
                    </div>
                    {isFromAssessment && (
                      <span className="text-xs text-violet-500 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full whitespace-nowrap">da última avaliação</span>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
            {patient.notes && (
              <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
                <p className="text-sm text-foreground" data-testid="text-patient-notes">{patient.notes}</p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setLocation(`/patients/${patient.id}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" /> Editar Dados
              </Button>
              <Button variant="outline" onClick={() => requestFollowUpMutation.mutate()} disabled={requestFollowUpMutation.isPending}>
                <FileText className="h-4 w-4 mr-2" />
                {requestFollowUpMutation.isPending ? "Gerando link..." : "Solicitar Anamnese de Retorno"}
              </Button>
            </div>
          </div>
        </div>

        {/* Acesso do Paciente */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <SectionHeader icon={<Users className="h-5 w-5" />} title="Acesso do Paciente" />
          <div className="p-6">
            {hasAccountLinked ? (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-200">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">Paciente tem acesso ao sistema</p>
                  <p className="text-sm text-green-600">Prescrições podem ser criadas</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <XCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800">Paciente ainda não possui acesso</p>
                    <p className="text-sm text-amber-600">Cadastro pendente no sistema</p>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-700">Para criar prescrições, o paciente precisa primeiro fazer o cadastro no sistema usando o link de cadastro fornecido.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderAnamnese() {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <SectionHeader icon={<Stethoscope className="h-5 w-5" />} title="Anamnese Nutricional" subtitle="Dados clínicos e hábitos alimentares do paciente" />
        <div className="p-6 space-y-4">
          {patient.goal && (
            <InfoRow icon={<Target className="h-4 w-4 text-violet-500" />} label="Objetivo" value={
              patient.goal === "lose_weight" ? "Perder peso" :
              patient.goal === "maintain_weight" ? "Manter peso" :
              patient.goal === "gain_weight" ? "Ganhar peso" : patient.goal
            } />
          )}
          {patient.activityLevel && (
            <InfoRow icon={<Activity className="h-4 w-4 text-green-500" />} label="Nível de Atividade" value={
              patient.activityLevel === "sedentary" ? "Sedentário" :
              patient.activityLevel === "light" ? "Levemente ativo" :
              patient.activityLevel === "moderate" ? "Moderadamente ativo" :
              patient.activityLevel === "active" ? "Ativo" :
              patient.activityLevel === "very_active" ? "Muito ativo" : patient.activityLevel
            } />
          )}
          {patient.biotype && (
            <InfoRow icon={<User className="h-4 w-4 text-indigo-500" />} label="Biotipo" value={
              patient.biotype === "gain_weight_easily" ? "Ganho peso facilmente" :
              patient.biotype === "hard_to_gain" ? "Dificuldade para ganhar peso" :
              patient.biotype === "gain_muscle_easily" ? "Ganho músculo facilmente" : patient.biotype
            } />
          )}
          {(patient.mealsPerDayCurrent || patient.mealsPerDayWilling) && (
            <InfoRow icon={<FileText className="h-4 w-4 text-blue-500" />} label="Refeições por dia" value={
              [patient.mealsPerDayCurrent && `Atual: ${patient.mealsPerDayCurrent}`, patient.mealsPerDayWilling && `Disposto: ${patient.mealsPerDayWilling}`].filter(Boolean).join(" | ")
            } />
          )}
          {patient.alcoholConsumption && (
            <InfoRow icon={<Heart className="h-4 w-4 text-slate-500" />} label="Consumo de Álcool" value={
              patient.alcoholConsumption === "no" ? "Não bebe" :
              patient.alcoholConsumption === "moderate" ? "Moderadamente" :
              patient.alcoholConsumption === "yes" ? "Sim, frequentemente" : patient.alcoholConsumption
            } />
          )}
          {patient.canEatMorningSolids !== undefined && (
            <InfoRow icon={<FileText className="h-4 w-4 text-indigo-500" />} label="Come sólidos pela manhã" value={patient.canEatMorningSolids ? "Sim" : "Não"} />
          )}
          {patient.likedHealthyFoods && Array.isArray(patient.likedHealthyFoods) && patient.likedHealthyFoods.length > 0 && (
            <TagsRow label="Alimentos saudáveis que gosta" tags={patient.likedHealthyFoods} color="emerald" />
          )}
          {patient.dislikedFoods && Array.isArray(patient.dislikedFoods) && patient.dislikedFoods.length > 0 && (
            <TagsRow label="Alimentos que não gosta" tags={patient.dislikedFoods} color="red" />
          )}
          {patient.hasIntolerance && patient.intolerances && Array.isArray(patient.intolerances) && patient.intolerances.length > 0 && (
            <TagsRow label="Intolerâncias" tags={patient.intolerances} color="orange" />
          )}
          {patient.diseases && (
            <InfoRow icon={<Stethoscope className="h-4 w-4 text-slate-500" />} label="Doenças/Condições" value={patient.diseases} />
          )}
          {patient.medications && (
            <InfoRow icon={<Pill className="h-4 w-4 text-blue-500" />} label="Medicamentos" value={patient.medications} />
          )}
          {patient.supplements && (
            <InfoRow icon={<Plus className="h-4 w-4 text-indigo-500" />} label="Suplementos" value={patient.supplements} />
          )}

          {/* Nutritionist calculation fields */}
          {!historyLoading && (
            <div className="mt-4 pt-4 border-t border-border/50">
              {currentAnamnesisRecord ? (
                <AnamnesisNutritionistDataForm anamnesis={currentAnamnesisRecord} patient={patient} />
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-800">Dados Nutricionais</h4>
                      <p className="text-sm text-amber-600">Crie um registro de anamnese para adicionar cálculos nutricionais (TMB, GET, VET)</p>
                    </div>
                  </div>
                  <Button onClick={() => createInitialAnamnesisRecord.mutate()} disabled={createInitialAnamnesisRecord.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                    {createInitialAnamnesisRecord.isPending ? "Criando..." : "Criar Registro de Anamnese"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderHistorico() {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <History className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Histórico de Anamnese</h3>
              <p className="text-xs text-muted-foreground">Registros anteriores de anamnese</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => requestFollowUpMutation.mutate()} disabled={requestFollowUpMutation.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            {requestFollowUpMutation.isPending ? "Gerando..." : "Nova Anamnese"}
          </Button>
        </div>
        <div className="p-6">
          {historyLoading ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600 mx-auto" /></div>
          ) : !anamnesisHistory || anamnesisHistory.length === 0 ? (
            <EmptyState icon={<History className="h-10 w-10" />} title="Nenhum histórico" description="Ainda não há registros de anamnese para este paciente." />
          ) : (
            <div className="space-y-4">
              {anamnesisHistory.map((record, index) => (
                <div key={record.id} className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">#{anamnesisHistory.length - index}</span>
                      <span className="text-sm font-medium">{record.createdAt ? formatDate(record.createdAt.toString()) : "Data desconhecida"}</span>
                    </div>
                    {index === anamnesisHistory.length - 1 && (
                      <Badge className="bg-green-100 text-green-700 text-xs">Atual</Badge>
                    )}
                  </div>
                  <div className="p-4">
                    <AnamnesisNutritionistDataForm anamnesis={record} patient={patient} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderAntropometria() {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Dumbbell className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Antropometria</h3>
              <p className="text-xs text-muted-foreground">Circunferências e dobras cutâneas</p>
            </div>
          </div>
          <Button onClick={() => openAnthroDialog()} className="bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nova Avaliação
          </Button>
        </div>
        <div className="p-6">
          {anthroLoading ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" /></div>
          ) : !anthroAssessments || anthroAssessments.length === 0 ? (
            <EmptyState icon={<Ruler className="h-10 w-10" />} title="Nenhuma avaliação antropométrica" description="Registre a primeira avaliação antropométrica deste paciente." action={<Button onClick={() => openAnthroDialog()} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="h-4 w-4 mr-2" />Nova Avaliação</Button>} />
          ) : (
            <div className="space-y-3">
              {anthroAssessments.map((assessment) => (
                <div key={assessment.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{assessment.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {assessment.createdAt ? formatDate(assessment.createdAt.toString()) : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {assessment.weightKg != null && <span className="text-violet-600 font-semibold">Peso: <strong>{assessment.weightKg} kg</strong></span>}
                        {assessment.circumWaist && <span>Cintura: <strong>{assessment.circumWaist} cm</strong></span>}
                        {assessment.circumHip && <span>Quadril: <strong>{assessment.circumHip} cm</strong></span>}
                        {assessment.circumAbdomen && <span>Abdômen: <strong>{assessment.circumAbdomen} cm</strong></span>}
                        {(() => {
                          const age = calculateAgeFromBirthDate(patient?.birthDate);
                          const sex = patient?.sex as "M" | "F" | "Outro" | null | undefined;
                          const equation = (nutritionistSettings?.bodyFatEquation || "siri") as "siri" | "brozek";
                          const r = calculateDurninBodyFat(assessment.foldTriceps, assessment.foldBiceps, assessment.foldSubscapular, assessment.foldSuprailiac, sex, age, equation);
                          if (!r) return null;
                          return (
                            <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                              <Percent className="h-3 w-3" />
                              %GC: <strong>{r.bodyFatPercent}%</strong>
                              <span className={`font-normal ${r.classificationColor}`}>({r.classification})</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="outline" title="Visualizar" onClick={() => { setAnthroToView(assessment); setIsAnthroViewOpen(true); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" title="Editar" onClick={() => { setAnthroToEdit(assessment); openAnthroDialog(assessment); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" title="Duplicar" onClick={() => { openAnthroDialog({ ...assessment, title: `${assessment.title} (cópia)` }); setAnthroToEdit(null); }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" title="Excluir">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Avaliação</AlertDialogTitle>
                            <AlertDialogDescription>Tem certeza que deseja excluir "{assessment.title}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAnthroMutation.mutate(assessment.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

  function renderPrescricoes() {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Prescrições Nutricionais</h3>
              <p className="text-xs text-muted-foreground">Planos alimentares criados para o paciente</p>
            </div>
          </div>
          <Button
            onClick={() => createPrescriptionMutation.mutate()}
            disabled={patientLoading || createPrescriptionMutation.isPending || !hasAccountLinked}
            title={!hasAccountLinked ? "Paciente precisa ter um login para criar prescrições" : "Nova Prescrição"}
            data-testid="button-new-prescription"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            {createPrescriptionMutation.isPending ? "Criando..." : "Nova Prescrição"}
          </Button>
        </div>
        <div className="p-6">
          {prescriptionsLoading ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" /></div>
          ) : prescriptions && prescriptions.length > 0 ? (
            <div className="space-y-4">
              {prescriptions.map((prescription) => (
                <div key={prescription.id} className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-base" data-testid={`text-prescription-title-${prescription.id}`}>{prescription.title}</h3>
                        <p className="text-xs text-gray-500">Criada em {new Date(prescription.createdAt!).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                    <Badge
                      variant={prescription.status === "published" ? "default" : "secondary"}
                      className={prescription.status === "published" ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}
                      data-testid={`badge-prescription-status-${prescription.id}`}
                    >
                      {prescription.status === "published" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                  {prescription.generalNotes && (
                    <div className="mt-2 p-3 bg-white/70 rounded-lg">
                      <p className="text-sm text-gray-700">{prescription.generalNotes}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Button variant="ghost" size="sm" onClick={() => setLocation(`/prescriptions/${prescription.id}/edit`)} data-testid={`button-edit-prescription-${prescription.id}`} className="bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200 rounded-lg">
                      <Eye className="h-4 w-4 mr-1" />{prescription.status === "published" ? "Visualizar" : "Editar"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => duplicatePrescriptionMutation.mutate(prescription.id)} disabled={duplicatePrescriptionMutation.isPending} data-testid={`button-duplicate-prescription-${prescription.id}`} className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200 rounded-lg">
                      <FileText className="h-4 w-4 mr-1" />{duplicatePrescriptionMutation.isPending ? "Duplicando..." : "Duplicar"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadPrescription(prescription.id)} data-testid={`button-download-prescription-${prescription.id}`} className="bg-green-100 hover:bg-green-200 text-green-700 border border-green-200 rounded-lg">
                      <FileDown className="h-4 w-4 mr-1" />Baixar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg" data-testid={`button-delete-prescription-${prescription.id}`}>
                          <Trash2 className="h-4 w-4 mr-1" />Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>Tem certeza de que deseja excluir a prescrição "{prescription.title}"? <span className="text-red-600 block mt-2">Esta ação não pode ser desfeita.</span></AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePrescriptionMutation.mutate(prescription.id)} disabled={deletePrescriptionMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deletePrescriptionMutation.isPending ? "Excluindo..." : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<FileText className="h-10 w-10" />} title="Nenhuma prescrição criada" description="Comece criando a primeira prescrição nutricional para este paciente." action={
              hasAccountLinked ? (
                <Button onClick={() => createPrescriptionMutation.mutate()} disabled={createPrescriptionMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />{createPrescriptionMutation.isPending ? "Criando..." : "Criar Primeira Prescrição"}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">O paciente precisa ter um login no sistema para receber prescrições.</p>
              )
            } />
          )}
        </div>
      </div>
    );
  }

  function renderAssinatura() {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Assinatura / Plano</h3>
              <p className="text-xs text-muted-foreground">Gerenciar plano do paciente</p>
            </div>
          </div>
          <Button onClick={() => setIsCreateSubscriptionDialogOpen(true)} disabled={currentSubscription?.status === "active"} className="bg-green-600 hover:bg-green-700 text-white" size="sm">
            <Plus className="h-4 w-4 mr-1" />Criar Plano
          </Button>
        </div>
        <div className="p-6">
          {currentSubscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">Plano Atual</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{getPlanTypeLabel(currentSubscription.planType)}</p>
                  <div className="mt-2">{renderStatusBadge(currentSubscription.status)}</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Validade</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {currentSubscription.expiresAt ? formatDate(currentSubscription.expiresAt.toString()) : "Sem expiração"}
                  </p>
                </div>
              </div>
              {currentSubscription.startDate && (
                <p className="text-sm text-muted-foreground">Iniciado em: {formatDate(currentSubscription.startDate.toString())}</p>
              )}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
                <Button onClick={handleEditSubscription} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Pencil className="h-4 w-4 mr-2" />Editar Plano
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir Plano</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>Tem certeza de que deseja excluir a assinatura {getPlanTypeLabel(currentSubscription.planType)} deste paciente? <span className="text-red-600 block mt-2">Esta ação não pode ser desfeita.</span></AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteSubscriptionMutation.mutate(currentSubscription.id)} disabled={deleteSubscriptionMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {deleteSubscriptionMutation.isPending ? "Excluindo..." : "Excluir"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <EmptyState icon={<CreditCard className="h-10 w-10" />} title="Sem assinatura ativa" description="Este paciente ainda não possui uma assinatura ativa." action={
              <Button onClick={() => setIsCreateSubscriptionDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />Criar Primeiro Plano
              </Button>
            } />
          )}
        </div>
      </div>
    );
  }

  function renderAvaliacoes() {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <SectionHeader icon={<ClipboardList className="h-5 w-5" />} title="Avaliações" subtitle="Documentos e arquivos de avaliação do paciente" />
        <div className="p-6 space-y-6">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
            <Label htmlFor="assessment-file" className="font-semibold">Enviar nova avaliação (PDF ou imagem)</Label>
            <Input id="assessment-file" type="file" ref={fileInputRef} accept=".pdf,image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} className="cursor-pointer" />
            {selectedFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: <span className="font-medium">{selectedFile.name}</span></p>}
            <Button onClick={() => selectedFile && uploadDocumentMutation.mutate(selectedFile)} disabled={!selectedFile || uploadDocumentMutation.isPending} className="w-full gap-2">
              <Upload className="h-4 w-4" />{uploadDocumentMutation.isPending ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avaliações Enviadas</p>
            {documentsLoading ? (
              <div className="text-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto" /></div>
            ) : !patientDocuments || patientDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-xl">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma avaliação enviada ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {patientDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("pt-BR") : ""}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <a href={doc.fileUrl} download={doc.fileName} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive gap-1">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Avaliação</AlertDialogTitle>
                            <AlertDialogDescription>Tem certeza que deseja excluir "{doc.fileName}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteDocumentMutation.mutate(doc.id)} disabled={deleteDocumentMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              {deleteDocumentMutation.isPending ? "Excluindo..." : "Excluir"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderDiario() {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <SectionHeader icon={<BookOpen className="h-5 w-5" />} title="Diário Alimentar" subtitle="Fotos e registros de humor enviados pelo paciente" />
        <div className="p-6">
          {foodDiaryLoading ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto" /></div>
          ) : foodDiaryEntries && foodDiaryEntries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {foodDiaryEntries.map((entry) => {
                const mealName = (entry.mealData as MealData)?.name ?? "Refeição";
                return (
                  <div key={entry.id} className="rounded-xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {entry.imageUrl && (
                      <div className="aspect-square relative group">
                        <img src={entry.imageUrl} alt="Foto da refeição" className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW0gbsOjbyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg=="; }}
                        />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEntryToDelete(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">{formatDate(entry.date)}</div>
                      </div>
                    )}
                    {!entry.imageUrl && (entry.moodBefore || entry.moodAfter) && (
                      <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 border-b border-purple-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smile className="h-5 w-5 text-purple-600" />
                            <span className="text-sm font-medium text-purple-800">Registro de Humor</span>
                          </div>
                          <span className="text-xs text-purple-600">{formatDate(entry.date)}</span>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Image className="h-4 w-4 text-orange-600" />
                        <span className="font-semibold text-gray-900">{mealName}</span>
                      </div>
                      {entry.prescriptionTitle && <p className="text-xs text-gray-500 mb-2">Prescrição: {entry.prescriptionTitle}</p>}
                      {(entry.moodBefore || entry.moodAfter) && (
                        <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Smile className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-gray-700">Humor</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            {entry.moodBefore && <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Antes:</span><span className="text-lg">{getMoodEmoji(entry.moodBefore)}</span><span className="text-gray-700">{getMoodLabel(entry.moodBefore)}</span></div>}
                            {entry.moodAfter && <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Depois:</span><span className="text-lg">{getMoodEmoji(entry.moodAfter)}</span><span className="text-gray-700">{getMoodLabel(entry.moodAfter)}</span></div>}
                          </div>
                          {entry.moodNotes && <p className="mt-2 text-xs text-gray-600"><span className="font-medium">Obs:</span> {entry.moodNotes}</p>}
                        </div>
                      )}
                      {entry.notes && <p className="text-sm text-gray-600"><span className="font-medium">Observações:</span> {entry.notes}</p>}
                      <p className="mt-3 text-xs text-gray-400">Enviado em {new Date(entry.createdAt!).toLocaleDateString("pt-BR")} às {new Date(entry.createdAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<Camera className="h-10 w-10" />} title="Nenhum registro no diário" description="O paciente ainda não enviou fotos ou registros de humor para as refeições." />
          )}
        </div>
      </div>
    );
  }

  const sectionMap: Record<SidebarSection, () => React.ReactNode> = {
    perfil: renderPerfil,
    anamnese: renderAnamnese,
    historico: renderHistorico,
    antropometria: renderAntropometria,
    prescricoes: renderPrescricoes,
    assinatura: renderAssinatura,
    avaliacoes: renderAvaliacoes,
    diario: renderDiario,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F4F5F9]">
      <Header
        title={patient.name}
        subtitle={patient.email || undefined}
        showBack
        onBack={() => setLocation("/patients")}
        drawerContent={<DefaultMobileDrawer />}
      />

      {/* Patient Banner */}
      <div className="bg-gradient-to-r from-violet-700 to-purple-600 text-white px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {patient.birthDate && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{calculateAge(patient.birthDate)} anos</span>
                )}
                {patient.sex && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{patient.sex === "F" ? "Feminino" : patient.sex === "M" ? "Masculino" : "Outro"}</span>
                )}
                {currentSubscription?.status === "active" ? (
                  <span className="text-xs bg-green-400/30 text-green-100 px-2 py-0.5 rounded-full">Plano ativo</span>
                ) : (
                  <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full">Sem plano ativo</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0" onClick={() => setLocation(`/patients/${patient.id}/edit`)}>
              <Pencil className="h-4 w-4 mr-1" />Editar
            </Button>
            <Button
              size="sm"
              onClick={() => createPrescriptionMutation.mutate()}
              disabled={createPrescriptionMutation.isPending || !hasAccountLinked}
              title={!hasAccountLinked ? "Paciente precisa ter um login" : "Nova Prescrição"}
              data-testid="button-new-prescription-banner"
              className="bg-white text-violet-700 hover:bg-violet-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              {createPrescriptionMutation.isPending ? "Criando..." : "Nova Prescrição"}
            </Button>
          </div>
        </div>
      </div>

      {/* Layout: Sidebar + Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="flex gap-6">

          {/* ── Sidebar (desktop) ── */}
          <aside className="hidden lg:flex flex-col w-64 flex-shrink-0">
            <nav className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden sticky top-6">
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seções</p>
              </div>
              <div className="py-2">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 group",
                        isActive
                          ? "bg-violet-50 border-r-2 border-violet-600"
                          : "hover:bg-muted/50 border-r-2 border-transparent"
                      )}
                    >
                      <div className={cn("p-1.5 rounded-lg flex-shrink-0 transition-colors", isActive ? "bg-violet-100" : "bg-muted/50 group-hover:bg-muted")}>
                        <Icon className={cn("h-4 w-4", isActive ? "text-violet-600" : "text-muted-foreground")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-medium leading-tight", isActive ? "text-violet-700" : "text-foreground")}>{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.description}</p>
                      </div>
                      {isActive && <ChevronRight className="h-4 w-4 text-violet-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* ── Mobile: bottom nav bar ── */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/60 shadow-lg">
            <div className="flex overflow-x-auto scrollbar-hide">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 flex-shrink-0 min-w-[64px] transition-colors",
                      isActive ? "text-violet-600" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight text-center">{item.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main Content ── */}
          <main className="flex-1 min-w-0 pb-20 lg:pb-0">
            {sectionMap[activeSection]?.()}
          </main>
        </div>
      </div>

      {/* ─── Dialogs ─────────────────────────────────────────────────────────── */}

      {/* Follow-up link */}
      <Dialog open={!!followUpLink} onOpenChange={() => setFollowUpLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de Anamnese de Retorno</DialogTitle>
            <DialogDescription>Envie este link para o paciente.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input value={followUpLink || ""} readOnly />
            <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(followUpLink!)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete diary entry */}
      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza de que deseja excluir esta entrada do diário alimentar? Tanto a foto quanto todas as informações associadas serão removidas permanentemente. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (entryToDelete) deletePhotoMutation.mutate(entryToDelete); }} disabled={deletePhotoMutation.isPending}>
              {deletePhotoMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Subscription */}
      <Dialog open={isCreateSubscriptionDialogOpen} onOpenChange={setIsCreateSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Assinatura</DialogTitle>
            <DialogDescription>Crie uma nova assinatura para o paciente {patient?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Plano</Label>
              <Select value={newSubscriptionPlanType} onValueChange={(v) => setNewSubscriptionPlanType(v as Subscription["planType"])}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo de plano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status Inicial</Label>
              <Select value={newSubscriptionStatus} onValueChange={(v) => setNewSubscriptionStatus(v as Subscription["status"])}>
                <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
                  <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de Expiração</Label>
              <Input type="date" value={newSubscriptionExpiresAt} onChange={(e) => setNewSubscriptionExpiresAt(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">
                {newSubscriptionPlanType === "free" ? "Deixe em branco para sem expiração" : `Se não informada, será calculada automaticamente: ${newSubscriptionPlanType === "monthly" ? "1 mês" : "3 meses"} a partir de hoje`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSubscriptionDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createSubscriptionMutation.mutate({ planType: newSubscriptionPlanType, status: newSubscriptionStatus, expiresAt: newSubscriptionExpiresAt || undefined })} disabled={createSubscriptionMutation.isPending}>
              {createSubscriptionMutation.isPending ? "Criando..." : "Criar Assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription */}
      <Dialog open={isEditSubscriptionDialogOpen} onOpenChange={setIsEditSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
            <DialogDescription>Edite a assinatura do paciente {patient?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Plano</Label>
              <Select value={newSubscriptionPlanType} onValueChange={(v) => setNewSubscriptionPlanType(v as Subscription["planType"])}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo de plano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={newSubscriptionStatus} onValueChange={(v) => setNewSubscriptionStatus(v as Subscription["status"])}>
                <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
                  <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de Expiração</Label>
              <Input type="date" value={newSubscriptionExpiresAt} onChange={(e) => setNewSubscriptionExpiresAt(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">
                {newSubscriptionPlanType === "free" ? "Deixe em branco para sem expiração" : "Defina a data de expiração do plano"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSubscriptionDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (currentSubscription) editSubscriptionMutation.mutate({ subscriptionId: currentSubscription.id, planType: newSubscriptionPlanType, status: newSubscriptionStatus, expiresAt: newSubscriptionExpiresAt || undefined }); }} disabled={editSubscriptionMutation.isPending}>
              {editSubscriptionMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anthropometry View Modal */}
      <Dialog open={isAnthroViewOpen} onOpenChange={(open) => { setIsAnthroViewOpen(open); if (!open) setAnthroToView(null); }}>
        <DialogContent className="max-w-2xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              {anthroToView?.title ?? "Avaliação Antropométrica"}
            </DialogTitle>
            <DialogDescription>
              {anthroToView?.createdAt ? new Date(anthroToView.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : ""}
            </DialogDescription>
          </DialogHeader>
          {anthroToView && (
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
              {anthroToView.weightKg != null && (
                <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-violet-200 bg-violet-50/50">
                  <div className="p-3 bg-violet-100 rounded-full">
                    <Weight className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-violet-500 font-medium uppercase tracking-wide">Peso registrado</p>
                    <p className="text-2xl font-bold text-violet-700">{anthroToView.weightKg} <span className="text-sm font-normal text-violet-400">kg</span></p>
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Circunferências Corporais</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Pescoço", value: anthroToView.circumNeck },
                    { label: "Tórax", value: anthroToView.circumChest },
                    { label: "Cintura", value: anthroToView.circumWaist },
                    { label: "Abdômen", value: anthroToView.circumAbdomen },
                    { label: "Quadril", value: anthroToView.circumHip },
                    { label: "Braço n. dom. relaxado", value: anthroToView.circumNonDominantArmRelaxed },
                    { label: "Braço n. dom. contraído", value: anthroToView.circumNonDominantArmContracted },
                    { label: "Coxa proximal n. dom.", value: anthroToView.circumNonDominantProximalThigh },
                    { label: "Panturrilha n. dom.", value: anthroToView.circumNonDominantCalf },
                  ].filter((item) => item.value != null).map((item) => (
                    <div key={item.label} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="text-sm font-semibold">{item.value} <span className="text-xs font-normal text-muted-foreground">cm</span></p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dobras Cutâneas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Bicipital", value: anthroToView.foldBiceps },
                    { label: "Tricipital", value: anthroToView.foldTriceps },
                    { label: "Subescapular", value: anthroToView.foldSubscapular },
                    { label: "Suprailíaca", value: anthroToView.foldSuprailiac },
                  ].filter((item) => item.value != null).map((item) => (
                    <div key={item.label} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="text-sm font-semibold">{item.value} <span className="text-xs font-normal text-muted-foreground">mm</span></p>
                    </div>
                  ))}
                </div>

                {/* Resultado do %GC - Durnin & Womersley (1974) */}
                {(() => {
                  const age = calculateAgeFromBirthDate(patient?.birthDate);
                  const sex = patient?.sex as "M" | "F" | "Outro" | null | undefined;
                  const equation = (nutritionistSettings?.bodyFatEquation || "siri") as "siri" | "brozek";
                  const result = calculateDurninBodyFat(
                    anthroToView.foldTriceps,
                    anthroToView.foldBiceps,
                    anthroToView.foldSubscapular,
                    anthroToView.foldSuprailiac,
                    sex,
                    age,
                    equation,
                    anthroToView.weightKg ? parseFloat(anthroToView.weightKg.toString()) : null
                  );
                  if (!result) return null;
                  return (
                    <>
                      <div className="mt-4 p-4 rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-orange-100 rounded-lg">
                            <Percent className="h-4 w-4 text-orange-600" />
                          </div>
                          <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">Percentual de Gordura — Durnin &amp; Womersley (1974)</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <p className="text-[10px] text-orange-600 font-medium uppercase mb-1">Soma das dobras</p>
                            <p className="text-xl font-bold text-orange-900">{result.sumFolds}<span className="text-xs font-normal ml-0.5">mm</span></p>
                          </div>
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <p className="text-[10px] text-orange-600 font-medium uppercase mb-1">% Gordura Corporal</p>
                            <p className="text-3xl font-bold text-orange-900">{result.bodyFatPercent}<span className="text-base font-normal ml-0.5">%</span></p>
                          </div>
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <p className="text-[10px] text-orange-600 font-medium uppercase mb-1">Classificação</p>
                            <p className={`text-sm font-bold ${result.classificationColor}`}>{result.classification}</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-orange-500 mt-2 text-center">Densidade corporal: {result.density} Kg/L · Equação de Brozek (1963)</p>
                      </div>

                      {/* Análise Completa por Dobras */}
                      <div className="mt-4 space-y-2 text-sm">
                      <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide mb-3">Análises por dobras e diâmetro ósseo</h4>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-1">Percentual de Gordura ({result.equation === 'brozek' ? 'Brozek, 1963' : 'Siri, 1961'})</p>
                          <p className="text-lg font-bold text-orange-600">{result.bodyFatPercent}%</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-1">Percentual Ideal</p>
                          <p className="text-lg font-bold text-blue-600">{result.idealBodyFatRange?.min}% a {result.idealBodyFatRange?.max}%</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                        <p className="text-[10px] text-muted-foreground mb-1">Classif. do % GC</p>
                        <p className={`text-sm font-bold ${result.classificationColor}`}>{result.classification}</p>
                      </div>

                      {result.fatMassKg != null && (
                        <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-1">Peso de gordura</p>
                          <p className="text-sm font-bold">{result.fatMassKg} <span className="text-xs font-normal text-muted-foreground">Kg</span></p>
                        </div>
                      )}

                      {result.leanMassKg != null && (
                        <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-1">Massa Livre de Gordura</p>
                          <p className="text-sm font-bold">{result.leanMassKg} <span className="text-xs font-normal text-muted-foreground">Kg</span></p>
                        </div>
                      )}

                      {result.residualWeightKg != null && (
                        <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-1">Peso residual</p>
                          <p className="text-sm font-bold">{result.residualWeightKg} <span className="text-xs font-normal text-muted-foreground">Kg</span></p>
                        </div>
                      )}

                      <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                        <p className="text-[10px] text-muted-foreground mb-1">Somatório de Dobras</p>
                        <p className="text-sm font-bold">{result.sumFolds} <span className="text-xs font-normal text-muted-foreground">mm</span></p>
                      </div>

                      <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                        <p className="text-[10px] text-muted-foreground mb-1">Densidade Corporal</p>
                        <p className="text-sm font-bold">{result.density} <span className="text-xs font-normal text-muted-foreground">Kg/L</span></p>
                      </div>

                      <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                        <p className="text-[10px] text-muted-foreground mb-1">Referência usada</p>
                        <p className="text-sm font-bold">Durnin &amp; Womersley, 1974</p>
                      </div>
                    </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          <DialogFooter className="p-6 pt-2 border-t flex-shrink-0 gap-2">
            <Button variant="outline" onClick={() => setIsAnthroViewOpen(false)}>Fechar</Button>
            <Button onClick={() => { if (anthroToView) { setIsAnthroViewOpen(false); openAnthroDialog(anthroToView); } }}>
              <Pencil className="h-4 w-4 mr-2" />Editar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anthropometry Create/Edit Dialog */}
      <Dialog open={isAnthroDialogOpen} onOpenChange={(open) => { setIsAnthroDialogOpen(open); if (!open) setAnthroToEdit(null); }}>
        <DialogContent className="max-w-lg w-full flex flex-col" style={{ maxHeight: "85vh" }}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{anthroToEdit ? "Editar Avaliação Antropométrica" : "Nova Avaliação Antropométrica"}</DialogTitle>
            <DialogDescription>Preencha o peso, circunferências e dobras cutâneas desta avaliação.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 space-y-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="anthro-title">Título da Avaliação</Label>
              <Input id="anthro-title" placeholder="Ex: Avaliação Março/2026" value={anthroForm.title} onChange={(e) => setAnthroForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="p-4 rounded-xl border-2 border-violet-200 bg-violet-50/50">
              <h3 className="text-sm font-semibold text-violet-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Weight className="h-4 w-4" /> Peso Corporal
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="anthro-weightKg" className="text-xs">Peso (kg)</Label>
                  <Input
                    id="anthro-weightKg"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 63.5"
                    value={anthroForm.weightKg}
                    onChange={(e) => setAnthroForm((f) => ({ ...f, weightKg: e.target.value }))}
                    className="text-lg font-semibold"
                  />
                </div>
                <div className="text-sm text-muted-foreground pt-5">
                  <span className="text-2xl font-bold text-violet-600">{anthroForm.weightKg || "—"}</span>
                  <span className="ml-1 text-violet-400">kg</span>
                </div>
              </div>
              <p className="text-xs text-violet-500 mt-2">O peso registrado aqui será usado para acompanhar a evolução do paciente ao longo das avaliações.</p>
            </div>
            <Accordion type="multiple" defaultValue={["item-1", "item-2"]} className="w-full space-y-2">
              {/* Seção 1: Circunferências Corporais */}
              <AccordionItem value="item-1" className="border border-border/60 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <AccordionTrigger className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-t-lg">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Circunferências Corporais (cm)</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 border-t border-border/40">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[
                      { key: "circumNeck", label: "Pescoço" },
                      { key: "circumChest", label: "Tórax" },
                      { key: "circumWaist", label: "Cintura" },
                      { key: "circumAbdomen", label: "Abdômen" },
                      { key: "circumHip", label: "Quadril" },
                      { key: "circumNonDominantArmRelaxed", label: "Braço n. dom. relaxado" },
                      { key: "circumNonDominantArmContracted", label: "Braço n. dom. contraído" },
                      { key: "circumNonDominantProximalThigh", label: "Coxa proximal n. dom." },
                      { key: "circumNonDominantCalf", label: "Panturrilha n. dom." },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`anthro-${key}`} className="text-xs font-medium text-muted-foreground">{label}</Label>
                        <Input id={`anthro-${key}`} type="number" step="0.1" placeholder="0.0" value={(anthroForm as any)[key]} onChange={(e) => setAnthroForm((f) => ({ ...f, [key]: e.target.value }))} className="h-9" />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Seção 2: Dobras Cutâneas e Composição Corporal */}
              <AccordionItem value="item-2" className="border border-border/60 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <AccordionTrigger className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-t-lg">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dobras Cutâneas e Composição Corporal</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 border-t border-border/40 space-y-4">
                  {/* Inputs de Dobras Cutâneas */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dobras Cutâneas - Equação de Durnin (mm)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "foldBiceps", label: "Bicipital" },
                        { key: "foldTriceps", label: "Tricipital" },
                        { key: "foldSubscapular", label: "Subescapular" },
                        { key: "foldSuprailiac", label: "Suprailíaca" },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <Label htmlFor={`anthro-${key}`} className="text-xs">{label}</Label>
                          <Input id={`anthro-${key}`} type="number" step="0.1" placeholder="0.0" value={(anthroForm as any)[key]} onChange={(e) => setAnthroForm((f) => ({ ...f, [key]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resultado automático do %GC - Durnin & Womersley (1974) */}
                  {(() => {
                    const age = calculateAgeFromBirthDate(patient?.birthDate);
                    const sex = patient?.sex as "M" | "F" | "Outro" | null | undefined;
                    const equation = (nutritionistSettings?.bodyFatEquation || "siri") as "siri" | "brozek";
                    const result = calculateDurninBodyFat(
                      anthroForm.foldTriceps ? parseFloat(anthroForm.foldTriceps) : null,
                      anthroForm.foldBiceps ? parseFloat(anthroForm.foldBiceps) : null,
                      anthroForm.foldSubscapular ? parseFloat(anthroForm.foldSubscapular) : null,
                      anthroForm.foldSuprailiac ? parseFloat(anthroForm.foldSuprailiac) : null,
                      sex,
                      age,
                      equation
                    );
                    if (!result) {
                      const hasAnyFold = anthroForm.foldTriceps || anthroForm.foldBiceps || anthroForm.foldSubscapular || anthroForm.foldSuprailiac;
                      if (!hasAnyFold) return null;
                      return (
                        <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-700">
                          <p className="font-medium">Preencha as 4 dobras e verifique se o paciente possui sexo e data de nascimento cadastrados para calcular o %GC automaticamente.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="mt-3 p-4 rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-orange-100 rounded-lg">
                            <Percent className="h-4 w-4 text-orange-600" />
                          </div>
                          <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">Resultado Durnin &amp; Womersley (1974)</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <p className="text-[10px] text-orange-600 font-medium uppercase">Soma dobras</p>
                            <p className="text-lg font-bold text-orange-900">{result.sumFolds}<span className="text-xs font-normal ml-0.5">mm</span></p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-orange-600 font-medium uppercase">% Gordura</p>
                            <p className="text-2xl font-bold text-orange-900">{result.bodyFatPercent}<span className="text-sm font-normal ml-0.5">%</span></p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-orange-600 font-medium uppercase">Classificação</p>
                            <p className={`text-sm font-bold ${result.classificationColor}`}>{result.classification}</p>
                          </div>
                        </div>
                          <p className="text-[10px] text-orange-500 mt-2 text-center">Densidade corporal: {result.density} Kg/L · Equação de Brozek (1963)</p>
                      </div>
                    );
                  })()}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <DialogFooter className="flex-shrink-0 pt-2 border-t border-border/40">
            <Button variant="outline" onClick={() => setIsAnthroDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submitAnthroForm} disabled={!anthroForm.title || createAnthroMutation.isPending || updateAnthroMutation.isPending}>
              {createAnthroMutation.isPending || updateAnthroMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-muted/20">
      <div className="p-2 bg-violet-100 rounded-lg">{icon && <span className="text-violet-600">{icon}</span>}</div>
      <div>
        <h3 className="font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: string; testId?: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
      <div className="p-1.5 bg-white rounded-lg shadow-sm flex-shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5" data-testid={testId}>{value}</p>
      </div>
    </div>
  );
}

function TagsRow({ label, tags, color }: { label: string; tags: string[]; color: "emerald" | "red" | "orange" }) {
  const colorMap = {
    emerald: { bg: "bg-emerald-50 border-emerald-100", tagBg: "bg-emerald-100 text-emerald-700" },
    red: { bg: "bg-red-50 border-red-100", tagBg: "bg-red-100 text-red-700" },
    orange: { bg: "bg-orange-50 border-orange-100", tagBg: "bg-orange-100 text-orange-700" },
  };
  const c = colorMap[color];
  return (
    <div className={cn("p-3 rounded-xl border", c.bg)}>
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <span key={i} className={cn("px-2 py-0.5 text-xs rounded-full font-medium", c.tagBg)}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 bg-muted/50 rounded-full w-20 h-20 flex items-center justify-center text-muted-foreground/50 mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
      {action}
    </div>
  );
}
