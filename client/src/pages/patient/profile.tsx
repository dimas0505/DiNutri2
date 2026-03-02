import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Mail, Calendar, Ruler, Weight,
  Activity, Target, Clipboard, TrendingUp,
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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const personalItems = patient
    ? [
        { icon: User,     label: "Nome Completo",       value: patient.name || "Não informado",                       color: "bg-purple-50 text-purple-600" },
        { icon: Mail,     label: "E-mail",               value: patient.email || "Não informado",                      color: "bg-violet-50 text-violet-600" },
        { icon: Calendar, label: "Data de Nascimento",   value: formatDate(patient.birthDate),                         color: "bg-fuchsia-50 text-fuchsia-600" },
        { icon: User,     label: "Sexo",                 value: getSexLabel(patient.sex),                              color: "bg-purple-50 text-purple-600" },
        { icon: Ruler,    label: "Altura",                value: patient.heightCm ? `${patient.heightCm} cm` : "Não informado", color: "bg-violet-50 text-violet-600" },
        { icon: Weight,   label: "Peso",                 value: latestAnthro?.weightKg != null ? `${latestAnthro.weightKg} kg` : (patient.weightKg ? `${patient.weightKg} kg` : "Não informado"), color: "bg-fuchsia-50 text-fuchsia-600" },
        { icon: Target,   label: "Objetivo",             value: getGoalLabel(patient.goal),                            color: "bg-purple-50 text-purple-600" },
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
      <div className="pb-6">

        {/* ── Banner de Perfil ── */}
        {patientLoading ? (
          <div className="mx-4 mt-4 rounded-2xl overflow-hidden">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : patient && (
          <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden shadow-md"
               style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 60%, #C084FC 100%)" }}>
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
                 style={{ background: "white", transform: "translate(30%, -30%)" }} />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10"
                 style={{ background: "white", transform: "translate(-30%, 30%)" }} />

            <div className="relative flex items-center gap-4 px-5 py-5">
              {/* Avatar com iniciais */}
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-white/20 border-2 border-white/40
                              flex items-center justify-center shadow-inner">
                <span className="text-white font-bold text-xl tracking-wide">
                  {getInitials(patient.name)}
                </span>
              </div>

              {/* Informações principais */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base leading-tight break-words">
                  {patient.name || "Paciente"}
                </p>
                <p className="text-white/75 text-xs mt-0.5 break-all">
                  {patient.email || ""}
                </p>
                {patient.goal && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full
                                   bg-white/20 text-white text-xs font-medium border border-white/30">
                    <Target className="h-3 w-3" />
                    {getGoalLabel(patient.goal)}
                  </span>
                )}
              </div>

              {/* Métricas rápidas */}
              {(() => {
                const displayWeight = latestAnthro?.weightKg ?? (patient.weightKg ? parseFloat(patient.weightKg) : null);
                return (patient.heightCm || displayWeight) ? (
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    {patient.heightCm && (
                      <div className="flex flex-col items-center bg-white/15 rounded-xl px-3 py-1.5 border border-white/20">
                        <span className="text-white font-bold text-sm leading-none">{patient.heightCm}</span>
                        <span className="text-white/70 text-[10px] mt-0.5">cm</span>
                      </div>
                    )}
                    {displayWeight != null && (
                      <div className="flex flex-col items-center bg-white/15 rounded-xl px-3 py-1.5 border border-white/20">
                        <span className="text-white font-bold text-sm leading-none">{displayWeight}</span>
                        <span className="text-white/70 text-[10px] mt-0.5">kg</span>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="px-4 mt-5">
          {patientLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : (
            <Tabs defaultValue="personal" className="w-full">
              {/* Tab switcher */}
              <TabsList className="w-full grid grid-cols-2 mb-5 h-11 rounded-xl bg-purple-50 p-1 gap-1">
                <TabsTrigger
                  value="personal"
                  className="rounded-lg text-sm font-medium transition-all
                             data-[state=active]:bg-white data-[state=active]:text-purple-700
                             data-[state=active]:shadow-sm data-[state=inactive]:text-purple-400"
                >
                  Dados Pessoais
                </TabsTrigger>
                <TabsTrigger
                  value="measures"
                  className="rounded-lg text-sm font-medium transition-all
                             data-[state=active]:bg-white data-[state=active]:text-purple-700
                             data-[state=active]:shadow-sm data-[state=inactive]:text-purple-400"
                >
                  Últimas Medidas
                </TabsTrigger>
              </TabsList>

              {/* ── Aba Dados Pessoais ── */}
              <TabsContent value="personal">
                <div className="space-y-2.5">
                  {personalItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl
                                   bg-white border border-gray-100 shadow-sm
                                   hover:shadow-md hover:border-purple-100 transition-all duration-200"
                      >
                        {/* Ícone com fundo colorido */}
                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Label e valor */}
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                          <span className="text-sm font-semibold text-foreground break-words">
                            {item.value}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* ── Aba Últimas Medidas ── */}
              <TabsContent value="measures">
                {anthroLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                  </div>
                ) : !latestAnthro ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center shadow-sm">
                      <Clipboard className="h-7 w-7 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Nenhuma avaliação disponível
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Seu nutricionista irá registrar suas medidas em breve.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">

                    {/* Cabeçalho da avaliação */}
                    <div className="flex items-center justify-between px-4 py-3.5 rounded-xl
                                    bg-white border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avaliação</p>
                          <p className="text-sm font-semibold text-foreground leading-tight">
                            {latestAnthro.title}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-purple-50 text-purple-700 border border-purple-100 font-medium"
                      >
                        {latestAnthro.createdAt
                          ? new Date(latestAnthro.createdAt).toLocaleDateString("pt-BR")
                          : ""}
                      </Badge>
                    </div>

                    {/* Circunferências */}
                    {circumferenceItems.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-4 rounded-full bg-purple-500" />
                          <p className="text-xs font-bold text-foreground uppercase tracking-widest">
                            Circunferências
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          {circumferenceItems.map(item => (
                            <div
                              key={item.label}
                              className="rounded-xl bg-white border border-gray-100 shadow-sm px-3.5 py-3
                                         hover:border-purple-100 hover:shadow-md transition-all duration-200"
                            >
                              <p className="text-[11px] text-muted-foreground leading-tight mb-1">{item.label}</p>
                              <p className="text-base font-bold text-foreground leading-none">
                                {item.value}
                                <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dobras Cutâneas */}
                    {foldItems.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-4 rounded-full bg-fuchsia-500" />
                          <p className="text-xs font-bold text-foreground uppercase tracking-widest">
                            Dobras Cutâneas
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          {foldItems.map(item => (
                            <div
                              key={item.label}
                              className="rounded-xl bg-white border border-gray-100 shadow-sm px-3.5 py-3
                                         hover:border-fuchsia-100 hover:shadow-md transition-all duration-200"
                            >
                              <p className="text-[11px] text-muted-foreground leading-tight mb-1">{item.label}</p>
                              <p className="text-base font-bold text-foreground leading-none">
                                {item.value}
                                <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
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
      </div>
    </MobileLayout>
  );
}
