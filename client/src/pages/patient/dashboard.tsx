import { ClipboardList, Cross, ShieldCheck, User, UtensilsCrossed, ChefHat, BookOpen, LogOut } from "lucide-react";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { InboxBellButton } from "@/components/InboxPanel";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useInvalidatePatientData } from "@/hooks/useInvalidatePatientData";
import type { Patient, Prescription, Subscription } from "@shared/schema";

interface DashboardCard {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const dashboardCards: DashboardCard[] = [
  {
    title: "Plano Alimentar",
    subtitle: "Suas refeições e prescrições",
    href: "/patient/prescription",
    icon: UtensilsCrossed,
    iconBg: "bg-[#F3ECFF]",
    iconColor: "text-[#8B5CF6]",
  },
  {
    title: "Minha Assinatura",
    subtitle: "Status da sua assinatura",
    href: "/my-plan",
    icon: ShieldCheck,
    iconBg: "bg-[#E5F8F1]",
    iconColor: "text-[#10B981]",
  },
  {
    title: "Meu Perfil",
    subtitle: "Dados pessoais da sua conta",
    href: "/profile",
    icon: User,
    iconBg: "bg-[#E8F0FF]",
    iconColor: "text-[#3B82F6]",
  },
  {
    title: "Avaliações",
    subtitle: "Suas avaliações e documentos",
    href: "/assessments",
    icon: ClipboardList,
    iconBg: "bg-[#FFF3E7]",
    iconColor: "text-[#F59E0B]",
  },
  {
    title: "Diário Alimentar",
    subtitle: "Fotos e humor das refeições",
    href: "/diary",
    icon: BookOpen,
    iconBg: "bg-[#FFEAF4]",
    iconColor: "text-[#EC4899]",
  },
  {
    title: "Suplementos",
    subtitle: "Rotina e recomendações",
    href: "/patient/supplements",
    icon: Cross,
    iconBg: "bg-[#FDEBEC]",
    iconColor: "text-[#EF4444]",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getGoalLabel(goal: string | null | undefined): string {
  switch (goal) {
    case "lose_weight": return "Perder peso";
    case "maintain_weight": return "Manter peso";
    case "gain_weight": return "Ganhar peso";
    default: return "Objetivo em definição";
  }
}

/**
 * Determina se a assinatura está realmente ativa, levando em conta
 * tanto o campo `status` quanto a data de expiração.
 */
function getPlanStatus(subscription: Subscription | null | undefined): {
  label: string;
  dotColor: string;
  bgColor: string;
} {
  if (!subscription) {
    return {
      label: "Sem plano ativo",
      dotColor: "bg-[#94A3B8]",
      bgColor: "bg-[#5B21B6]/45",
    };
  }

  const now = new Date();
  const isExpiredByDate = subscription.expiresAt
    ? new Date(subscription.expiresAt) < now
    : false;

  if (isExpiredByDate || subscription.status === "expired" || subscription.status === "canceled") {
    return {
      label: subscription.status === "canceled" ? "Plano cancelado" : "Plano expirado",
      dotColor: "bg-[#EF4444]",
      bgColor: "bg-[#5B21B6]/45",
    };
  }

  if (subscription.status === "pending_payment") {
    return {
      label: "Pagamento pendente",
      dotColor: "bg-[#F59E0B]",
      bgColor: "bg-[#5B21B6]/45",
    };
  }

  if (subscription.status === "pending_approval") {
    return {
      label: "Aguardando aprovação",
      dotColor: "bg-[#F59E0B]",
      bgColor: "bg-[#5B21B6]/45",
    };
  }

  if (subscription.status === "active") {
    return {
      label: "Plano ativo",
      dotColor: "bg-[#22C55E]",
      bgColor: "bg-[#5B21B6]/45",
    };
  }

  return {
    label: "Sem plano ativo",
    dotColor: "bg-[#94A3B8]",
    bgColor: "bg-[#5B21B6]/45",
  };
}

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const invalidatePatientData = useInvalidatePatientData();
  // O hook usePushNotifications ainda é usado pelo NotificationPrompt (renderizado abaixo)
  usePushNotifications();

  // Invalida o cache ao montar o dashboard (ex: ao retornar via barra de navegação
  // inferior ou acessar diretamente pela URL)
  useEffect(() => {
    invalidatePatientData();
  }, [invalidatePatientData]);

  /**
   * Navega para uma tela do paciente garantindo dados sempre frescos.
   * Invalida o cache antes de navegar para que o React Query
   * busque dados atualizados do servidor ao montar a nova tela.
   */
  const handleNavigate = (href: string) => {
    invalidatePatientData();
    setLocation(href);
  };

  const { data: patientProfile } = useQuery<Patient>({
    queryKey: ["/api/patient/my-profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patient/my-profile");
      return res.json();
    },
  });

  const { data: subscription } = useQuery<Subscription | null>({
    queryKey: ["/api/patients", patientProfile?.id, "subscription"],
    queryFn: async () => {
      // Trata 404 como "sem assinatura" em vez de lançar erro
      const res = await fetch(`/api/patients/${patientProfile!.id}/subscription`, {
        credentials: "include",
      });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!patientProfile?.id,
    retry: false,
  });

  const planStatus = getPlanStatus(subscription);

  // Buscar prescrições para detectar planos em preparação
  const { data: prescriptions = [] } = useQuery<Prescription[]>({
    queryKey: ["/api/patient/my-prescriptions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patient/my-prescriptions");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!patientProfile?.id,
    retry: false,
  });

  // Planos em preparação (status = "preparing")
  const preparingPlans = prescriptions.filter((p: Prescription) => p.status === "preparing");

  // Divide os 6 cards: primeira linha com 2 cards destacados (maiores),
  // e as 2 linhas seguintes com 2 cards cada no grid padrão.
  const [featuredCards, gridCards] = [dashboardCards.slice(0, 2), dashboardCards.slice(2)];

  return (
    <MobileLayout hideHeader>
      {/* Popup persuasivo para ativar notificações push */}
      <NotificationPrompt />
      <div className="min-h-screen bg-[#F0F1F7] pb-24">
        <section className="bg-gradient-to-b from-[#5B21B6] to-[#7C3AED] text-white px-5 pt-[max(12px,env(safe-area-inset-top))] pb-8 rounded-b-[22px] shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/85 flex items-center justify-center">
                <User className="w-6 h-6 text-[#7C3AED]" />
              </div>
              <div>
                <p className="text-sm text-white/90 leading-none">{getGreeting()},</p>
                <h1 className="text-[1.6rem] font-bold leading-tight">{(user as any)?.firstName || "Paciente"}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sininho de inbox in-app — funciona independente de permissão push */}
              <InboxBellButton />
              <button
                type="button"
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                onClick={logout}
                title="Sair"
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/18 text-sm">
              <span className="w-2.5 h-2.5 bg-white rounded-sm" />
              Objetivo: {getGoalLabel(patientProfile?.goal)}
            </div>
            <div className="block">
              <span className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm", planStatus.bgColor)}>
                <span className={cn("w-2.5 h-2.5 rounded-full", planStatus.dotColor)} />
                {planStatus.label}
              </span>
            </div>
          </div>
        </section>

        {/* Banner informativo: plano em preparação */}
        {preparingPlans.length > 0 && (
          <section className="px-5 pt-4">
            {preparingPlans.map((plan: Prescription) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => handleNavigate("/patient/prescriptions")}
                className="w-full text-left rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 shadow-md p-4 flex items-start gap-3"
                data-testid={`banner-preparing-plan-${plan.id}`}
              >
                <div className="p-2 bg-orange-100 rounded-xl flex-shrink-0">
                  <ChefHat className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-orange-900 leading-tight">
                    Plano em Preparação
                  </p>
                  <p className="text-xs text-orange-700 mt-0.5 leading-snug">
                    Seu nutricionista está elaborando <span className="font-medium">{plan.title}</span>. Você será notificado quando estiver pronto.
                  </p>
                </div>
                <span className="text-orange-400 text-lg leading-none flex-shrink-0">›</span>
              </button>
            ))}
          </section>
        )}

        <section className="px-5 pt-5">
          <h2 className="text-[1.7rem] font-bold text-[#252638]">Menu do Paciente</h2>
          <p className="text-[0.95rem] text-[#6C7282] mt-1">Acesse suas informações e acompanhe sua evolução</p>

          {/* Dois cards principais em destaque — linha superior com altura maior */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {featuredCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => handleNavigate(card.href)}
                  className="bg-white rounded-2xl px-3 py-5 min-h-[160px] border border-[#E9E9EF] shadow-[0_2px_8px_rgba(12,12,13,0.04)] flex flex-col items-center justify-center text-center"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", card.iconBg)}>
                    <Icon className={cn("w-6 h-6", card.iconColor)} />
                  </div>
                  <h3 className="mt-2.5 text-[1.1rem] font-bold text-[#272838] leading-tight">{card.title}</h3>
                  <p className="mt-1 text-[0.72rem] text-[#6B7280] leading-snug">{card.subtitle}</p>
                </button>
              );
            })}
          </div>

          {/* Quatro cards restantes em grid 2×2 */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            {gridCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => handleNavigate(card.href)}
                  className="bg-white rounded-2xl px-3 py-3 min-h-[130px] border border-[#E9E9EF] shadow-[0_2px_8px_rgba(12,12,13,0.04)] flex flex-col items-center justify-center text-center"
                >
                  <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center", card.iconBg)}>
                    <Icon className={cn("w-5 h-5", card.iconColor)} />
                  </div>
                  <h3 className="mt-2 text-[1.05rem] font-bold text-[#272838] leading-tight">{card.title}</h3>
                  <p className="mt-1 text-[0.72rem] text-[#6B7280] leading-snug">{card.subtitle}</p>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
}
