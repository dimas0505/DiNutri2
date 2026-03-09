import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInvalidatePatientData } from "@/hooks/useInvalidatePatientData";
import { apiRequest } from "@/lib/queryClient";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Mail, Calendar, Ruler, Weight,
  Activity, Target,
} from "lucide-react";
import type { Patient } from "@shared/schema";
import { PushNotificationManager } from "@/components/PushNotificationManager";

export default function PatientProfilePage() {
  const invalidatePatientData = useInvalidatePatientData();

  // Invalida o cache ao montar a tela para garantir dados frescos
  useEffect(() => {
    invalidatePatientData();
  }, [invalidatePatientData]);

  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patient/my-profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patient/my-profile");
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
        { icon: Weight,   label: "Peso",                 value: patient.weightKg ? `${patient.weightKg} kg` : "Não informado", color: "bg-fuchsia-50 text-fuchsia-600" },
        { icon: Target,   label: "Objetivo",             value: getGoalLabel(patient.goal),                            color: "bg-purple-50 text-purple-600" },
      ]
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
                const displayWeight = patient.weightKg ? parseFloat(patient.weightKg) : null;
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

        <div className="px-4 mt-5">
          {patientLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-2.5">
              <PushNotificationManager />
              {personalItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl
                               bg-white border border-gray-100 shadow-sm
                               hover:shadow-md hover:border-purple-100 transition-all duration-200"
                  >
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>

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
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
