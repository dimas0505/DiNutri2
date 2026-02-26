import { Bell, ClipboardList, Cross, FlaskConical, Lightbulb, ShieldCheck, TrendingUp, User, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

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
    title: "Anamnese",
    subtitle: "Histórico de avaliações",
    href: "/diary",
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
    title: "Orientações",
    subtitle: "Dicas do nutricionista",
    href: "/guidelines",
    icon: Lightbulb,
    iconBg: "bg-[#EEE8FF]",
    iconColor: "text-[#8B5CF6]",
  },
  {
    title: "Exames",
    subtitle: "Seus resultados laboratoriais",
    href: "/exams",
    icon: FlaskConical,
    iconBg: "bg-[#EAF8FC]",
    iconColor: "text-[#06B6D4]",
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

export default function PatientDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <MobileLayout hideHeader>
      <div className="min-h-screen bg-[#F0F1F7] pb-24">
codex/update-patient-view-to-match-apk-design-46d66b
        <section className="bg-gradient-to-b from-[#5B21B6] to-[#7C3AED] text-white px-5 pt-[max(12px,env(safe-area-inset-top))] pb-8 rounded-b-[22px] shadow-sm">
        <section className="bg-gradient-to-b from-[#5B21B6] to-[#7C3AED] text-white px-5 pt-3 pb-8 rounded-b-[22px] shadow-sm">
> main
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/85 flex items-center justify-center">
                <User className="w-6 h-6 text-[#7C3AED]" />
              </div>
              <div>
<<<<< codex/update-patient-view-to-match-apk-design-46d66b
                <p className="text-sm text-white/90 leading-none">{getGreeting()},</p>
                <h1 className="text-[1.75rem] font-bold leading-tight">{(user as any)?.firstName || "Paciente"}</h1>

                <p className="text-[30px] text-white/90 leading-none">{getGreeting()},</p>
                <h1 className="text-[40px] font-bold leading-tight">{(user as any)?.firstName || "Paciente"}</h1>
        main
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
              Objetivo: Ganhar Peso
            </div>
            <div className="block">
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#5B21B6]/45 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                Plano Ativo
              </span>
            </div>
          </div>
        </section>

        <section className="px-5 pt-5">
codex/update-patient-view-to-match-apk-design-46d66b
          <h2 className="text-[1.9rem] font-bold text-[#252638]">Menu do Paciente</h2>
          <p className="text-[1rem] text-[#6C7282] mt-1">Acesse suas informações e acompanhe sua evolução</p>

          <h2 className="text-[32px] font-bold text-[#252638]">Menu do Paciente</h2>
          <p className="text-[26px] text-[#6C7282] mt-1">Acesse suas informações e acompanhe sua evolução</p>
 main

          <div className="mt-4 grid grid-cols-2 gap-3">
            {dashboardCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => setLocation(card.href)}
codex/update-patient-view-to-match-apk-design-46d66b
                  className="bg-white rounded-2xl px-3 py-3.5 min-h-[148px] border border-[#E9E9EF] shadow-[0_2px_8px_rgba(12,12,13,0.04)] flex flex-col items-center justify-center text-center"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", card.iconBg)}>
                    <Icon className={cn("w-6 h-6", card.iconColor)} />
                  </div>
                  <h3 className="mt-2.5 text-[1.22rem] font-bold text-[#272838] leading-tight">{card.title}</h3>
                  <p className="mt-1 text-[0.78rem] text-[#6B7280] leading-snug">{card.subtitle}</p>

                  className="bg-white rounded-2xl px-3 py-5 min-h-[184px] border border-[#E9E9EF] shadow-[0_2px_8px_rgba(12,12,13,0.04)] flex flex-col items-center justify-center text-center"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", card.iconBg)}>
                    <Icon className={cn("w-7 h-7", card.iconColor)} />
                  </div>
                  <h3 className="mt-3 text-[31px] font-bold text-[#272838] leading-tight">{card.title}</h3>
                  <p className="mt-1 text-[22px] text-[#6B7280] leading-snug">{card.subtitle}</p>
main
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
}
