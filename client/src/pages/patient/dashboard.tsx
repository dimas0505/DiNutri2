import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/layout/mobile-layout";
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  HeartPulse,
  Target,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  {
    title: "Meu Plano",
    subtitle: "Veja sua prescrição atual",
    href: "/patient/prescription",
    icon: ClipboardCheck,
  },
  {
    title: "Evolução",
    subtitle: "Acompanhe seu progresso",
    href: "/evolution",
    icon: HeartPulse,
  },
  {
    title: "Metas",
    subtitle: "Defina seus objetivos",
    href: "/goals",
    icon: Target,
  },
  {
    title: "Exames",
    subtitle: "Histórico de resultados",
    href: "/exams",
    icon: FileText,
  },
  {
    title: "Orientações",
    subtitle: "Recomendações da nutri",
    href: "/guidelines",
    icon: BookOpen,
  },
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <MobileLayout hideHeader>
      <div className="min-h-screen pb-24 bg-[#F5F8F7]">
        <section className="bg-gradient-to-b from-[#4E9F87] to-[#3f8f78] text-white px-5 pt-10 pb-8 rounded-b-[32px] shadow-sm">
          <p className="text-sm/5 text-white/80">Olá,</p>
          <h1 className="text-2xl font-bold mt-1">
            {(user as any)?.firstName || "Paciente"}
          </h1>
          <p className="text-sm text-white/80 mt-2">Vamos cuidar da sua evolução hoje.</p>
        </section>

        <section className="px-4 -mt-5 space-y-3">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setLocation(item.href)}
                className={cn(
                  "w-full bg-white rounded-2xl p-4 text-left",
                  "shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-gray-100",
                  "flex items-center gap-3",
                )}
              >
                <div className="w-11 h-11 rounded-xl bg-[#4E9F87]/10 text-[#4E9F87] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-800">{item.title}</h2>
                  <p className="text-sm text-gray-500">{item.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            );
          })}
        </section>
      </div>
    </MobileLayout>
  );
}
