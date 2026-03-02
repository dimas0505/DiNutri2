import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, Ruler, Weight, Activity, Target, Clipboard, Percent } from "lucide-react";
import type { Patient, AnthropometricAssessment } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
// Importações mantidas para reativação futura do cálculo automático Durnin & Womersley
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { calculateDurninBodyFat, calculateAgeFromBirthDate } from "@/utils/durnin-body-fat";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}

export function ProfileModal({ open, onOpenChange, patient }: ProfileModalProps) {
  if (!patient) return null;

  const { data: latestAnthro } = useQuery<AnthropometricAssessment>({
    queryKey: ["/api/my-anthropometry/latest"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-anthropometry/latest");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: open,
    retry: false,
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Não informado";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const getSexLabel = (sex: string | null | undefined) => {
    switch (sex) {
      case "M": return "Masculino";
      case "F": return "Feminino";
      case "Outro": return "Outro";
      default: return "Não informado";
    }
  };

  const getGoalLabel = (goal: string | null | undefined) => {
    switch (goal) {
      case "lose_weight": return "Perder peso";
      case "maintain_weight": return "Manter peso";
      case "gain_weight": return "Ganhar peso";
      default: return "Não informado";
    }
  };

  const personalItems = [
    { icon: User, label: "Nome Completo", value: patient.name || "Não informado" },
    { icon: Mail, label: "E-mail", value: patient.email || "Não informado" },
    { icon: Calendar, label: "Data de Nascimento", value: formatDate(patient.birthDate) },
    { icon: User, label: "Sexo", value: getSexLabel(patient.sex) },
    { icon: Ruler, label: "Altura", value: patient.heightCm ? `${patient.heightCm} cm` : "Não informado" },
    { icon: Weight, label: "Peso", value: patient.weightKg ? `${patient.weightKg} kg` : "Não informado" },
    { icon: Target, label: "Objetivo", value: getGoalLabel(patient.goal) },
  ];

  const circumferenceItems = latestAnthro ? [
    { label: "Pescoço", value: latestAnthro.circumNeck, unit: "cm" },
    { label: "Tórax", value: latestAnthro.circumChest, unit: "cm" },
    { label: "Cintura", value: latestAnthro.circumWaist, unit: "cm" },
    { label: "Abdômen", value: latestAnthro.circumAbdomen, unit: "cm" },
    { label: "Quadril", value: latestAnthro.circumHip, unit: "cm" },
    { label: "Braço n. dom. relaxado", value: latestAnthro.circumNonDominantArmRelaxed, unit: "cm" },
    { label: "Braço n. dom. contraído", value: latestAnthro.circumNonDominantArmContracted, unit: "cm" },
    { label: "Coxa proximal n. dom.", value: latestAnthro.circumNonDominantProximalThigh, unit: "cm" },
    { label: "Panturrilha n. dom.", value: latestAnthro.circumNonDominantCalf, unit: "cm" },
  ].filter(i => i.value != null) : [];

  const foldItems = latestAnthro ? [
    { label: "Bicipital", value: latestAnthro.foldBiceps, unit: "mm" },
    { label: "Tricipital", value: latestAnthro.foldTriceps, unit: "mm" },
    { label: "Subescapular", value: latestAnthro.foldSubscapular, unit: "mm" },
    { label: "Suprailíaca", value: latestAnthro.foldSuprailiac, unit: "mm" },
  ].filter(i => i.value != null) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-lg mx-0 left-[50%] right-auto translate-x-[-50%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600" />
            Meu Perfil
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="measures">Últimas Medidas</TabsTrigger>
          </TabsList>

          {/* ── Aba Dados Pessoais ── */}
          <TabsContent value="personal">
            <div className="space-y-2">
              {personalItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                    <Icon className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium text-right truncate">{item.value}</span>
                    </div>
                  </div>
                );
              })}

            </div>
          </TabsContent>

          {/* ── Aba Últimas Medidas ── */}
          <TabsContent value="measures">
            {!latestAnthro ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="p-4 rounded-full bg-muted/50">
                  <Clipboard className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nenhuma avaliação disponível ainda.</p>
                <p className="text-xs text-muted-foreground/70 max-w-[260px]">Seu nutricionista irá atualizar suas medidas em breve.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold">{latestAnthro.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {latestAnthro.createdAt ? new Date(latestAnthro.createdAt).toLocaleDateString("pt-BR") : ""}
                  </Badge>
                </div>

                {circumferenceItems.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Circunferências</p>
                    <div className="grid grid-cols-2 gap-2">
                      {circumferenceItems.map((item) => (
                        <div key={item.label} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-sm font-semibold">{item.value} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {foldItems.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dobras Cutâneas</p>
                    <div className="grid grid-cols-2 gap-2">
                      {foldItems.map((item) => (
                        <div key={item.label} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-sm font-semibold">{item.value} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card de % Gordura Corporal
                     Exibido quando o nutricionista preenche os valores manuais.
                     Independente de haver dobras cutâneas cadastradas.
                     O cálculo automático Durnin & Womersley está adormecido (comentado) até reativação futura. */}
                {latestAnthro?.manualBodyFatPercent != null && !isNaN(latestAnthro.manualBodyFatPercent) && (
                  <div className="mt-1 p-3 rounded-xl border-2 border-orange-200"
                       style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="p-1 bg-orange-100 rounded">
                        <Percent className="h-3.5 w-3.5 text-orange-600" />
                      </div>
                      <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wide">% Gordura Corporal</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-orange-600 font-medium">Percentual de gordura</p>
                        <p className="text-2xl font-bold text-orange-900">{latestAnthro.manualBodyFatPercent}<span className="text-sm font-normal ml-0.5">%</span></p>
                      </div>
                      {latestAnthro.manualBodyFatClassification && (
                        <div className="text-right">
                          <p className="text-[10px] text-orange-600 font-medium">Classificação</p>
                          <p className="text-sm font-bold text-orange-800">{latestAnthro.manualBodyFatClassification}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}