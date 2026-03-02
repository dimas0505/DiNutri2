import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Mail, Calendar, Ruler, Weight,
  FileText, Activity, Target, Clipboard,
} from "lucide-react";
import type { Patient, AnthropometricAssessment } from "@shared/schema";

export default function PatientProfilePage() {
  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patient/my-profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patient/my-profile");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const { data: latestAnthro, isLoading: anthroLoading } = useQuery<AnthropometricAssessment>({
    queryKey: ["/api/my-anthropometry/latest"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-anthropometry/latest");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Não informado";
    try {
      return new Date(dateString).toLocaleDateString("pt-BR");
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

  const personalItems = patient
    ? [
        { icon: User,     label: "Nome Completo",       value: patient.name || "Não informado" },
        { icon: Mail,     label: "E-mail",               value: patient.email || "Não informado" },
        { icon: Calendar, label: "Data de Nascimento",   value: formatDate(patient.birthDate) },
        { icon: User,     label: "Sexo",                 value: getSexLabel(patient.sex) },
        { icon: Ruler,    label: "Altura",                value: patient.heightCm ? `${patient.heightCm} cm` : "Não informado" },
        { icon: Weight,   label: "Peso",                 value: patient.weightKg ? `${patient.weightKg} kg` : "Não informado" },
        { icon: Target,   label: "Objetivo",             value: getGoalLabel(patient.goal) },
      ]
    : [];

  const circumferenceItems = latestAnthro
    ? [
        { label: "Pescoço",                  value: latestAnthro.circumNeck,                      unit: "cm" },
        { label: "Tórax",                    value: latestAnthro.circumChest,                     unit: "cm" },
        { label: "Cintura",                  value: latestAnthro.circumWaist,                     unit: "cm" },
        { label: "Abdômen",                  value: latestAnthro.circumAbdomen,                   unit: "cm" },
        { label: "Quadril",                  value: latestAnthro.circumHip,                       unit: "cm" },
        { label: "Braço n. dom. relaxado",   value: latestAnthro.circumNonDominantArmRelaxed,     unit: "cm" },
        { label: "Braço n. dom. contraído",  value: latestAnthro.circumNonDominantArmContracted,  unit: "cm" },
        { label: "Coxa proximal n. dom.",    value: latestAnthro.circumNonDominantProximalThigh,  unit: "cm" },
        { label: "Panturrilha n. dom.",      value: latestAnthro.circumNonDominantCalf,           unit: "cm" },
      ].filter(i => i.value != null)
    : [];

  const foldItems = latestAnthro
    ? [
        { label: "Bicipital",      value: latestAnthro.foldBiceps,       unit: "mm" },
        { label: "Tricipital",     value: latestAnthro.foldTriceps,      unit: "mm" },
        { label: "Subescapular",   value: latestAnthro.foldSubscapular,  unit: "mm" },
        { label: "Suprailíaca",    value: latestAnthro.foldSuprailiac,   unit: "mm" },
      ].filter(i => i.value != null)
    : [];

  return (
    <MobileLayout title="Meu Perfil" showBackButton>
      <div className="p-4">
        {patientLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : (
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
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium text-right truncate">{item.value}</span>
                      </div>
                    </div>
                  );
                })}
                {patient?.notes && (
                  <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-muted/40">
                    <FileText className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground block mb-1">Observações</span>
                      <span className="text-sm whitespace-pre-wrap">{patient.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Aba Últimas Medidas ── */}
            <TabsContent value="measures">
              {anthroLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : !latestAnthro ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Clipboard className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Nenhuma avaliação disponível ainda.
                  </p>
                  <p className="text-xs text-muted-foreground/70 max-w-[260px]">
                    Seu nutricionista irá atualizar suas medidas em breve.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-semibold">{latestAnthro.title}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {latestAnthro.createdAt
                        ? new Date(latestAnthro.createdAt).toLocaleDateString("pt-BR")
                        : ""}
                    </Badge>
                  </div>

                  {circumferenceItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Circunferências
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {circumferenceItems.map(item => (
                          <div
                            key={item.label}
                            className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                          >
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="text-sm font-semibold">
                              {item.value}{" "}
                              <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {foldItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Dobras Cutâneas
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {foldItems.map(item => (
                          <div
                            key={item.label}
                            className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                          >
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="text-sm font-semibold">
                              {item.value}{" "}
                              <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MobileLayout>
  );
}
