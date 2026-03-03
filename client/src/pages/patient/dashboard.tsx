import { Bell, ClipboardList, Cross, ShieldCheck, TrendingUp, User, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Patient, Subscription } from "@shared/schema";

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
    title: "Meu Plano",
    subtitle: "Status da sua assinatura",
    href: "/my-plan",
    icon: ShieldCheck,
    iconBg: "bg-[#E5F8F1]",
    iconColor: "text-[#10B981]",
  },
  {
    title: "Meu Perfil",
    subtitle: "Dados pessoais e medidas",
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
    title: "Evolução",
    subtitle: "Diário e evolução fotográfica",
    href: "/evolution",
    icon: TrendingUp,
    iconBg: "bg-[#FFEAF4]",
    iconColor: "text-[#EC4899]",
  },
  {
    title: "Suplementos",
    subtitle: "Rotina e recomendações",
    href: "/goals",
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

  if (subscription.status === "pending_plan") {
    return {
      label: "Plano em preparação",
      dotColor: "bg-[#F97316]",
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
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: patientProfile } = useQuery<Patient>({
    queryKey: ["/api/patient/my-profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patient/my-profile");
      return res.json();
    },
  });

  const { data: subscription } = useQuery<Subscription>({
    queryKey: ["/api/patients", patientProfile?.id, "subscription"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/patients/${patientProfile!.id}/subscription`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!patientProfile?.id,
    // Não lançar erro quando não há plano (404 é esperado)
    retry: false,
  });

  const planStatus = getPlanStatus(subscription);

  // Divide os 6 cards: primeira linha com 2 cards destacados (maiores),
  // e as 2 linhas seguintes com 2 cards cada no grid padrão.
  const [featuredCards, gridCards] = [dashboardCards.slice(0, 2), dashboardCards.slice(2)];

  return (
    <MobileLayout hideHeader>
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

            <button
              type="button"
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
              onClick={() => setLocation("/profile")}
            >
              <Bell className="w-5 h-5 text-white" />
            </button>
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
                  onClick={() => setLocation(card.href)}
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
                  onClick={() => setLocation(card.href)}
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
