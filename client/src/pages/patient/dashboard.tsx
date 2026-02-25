import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { User, Bell, ChevronRight, Apple, TrendingUp, BookOpen, Target, FlaskConical, FileText } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { MobileLayout } from "@/components/layout/mobile-layout";

export default function PatientDashboard() {
  const { user } = useAuth();

  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["/api/prescriptions/patient", user?.id],
    enabled: !!user?.id,
  });

  const activePrescription = (prescriptions as any[])?.find((p: any) => p.isActive) || (prescriptions as any[])?.[0];

  return (
    <MobileLayout hideHeader showBottomNav>
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-[#4E9F87] to-[#7FD1B9] rounded-b-[40px] pt-16 pb-12 px-6 text-white shadow-md relative">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/50 overflow-hidden backdrop-blur-sm shadow-sm">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/90 font-medium">Olá,</p>
                <h1 className="text-2xl font-bold tracking-tight">
                  {(user as any)?.name?.split(" ")[0] || "Paciente"}
                </h1>
              </div>
            </div>
            <button className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center relative backdrop-blur-sm border border-white/20 shadow-sm active:scale-95 transition-transform">
              <Bell className="w-6 h-6 text-white" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-[#FF6B6B] rounded-full border-2 border-[#66B8A0]" />
            </button>
          </div>
        </div>

        {/* Featured Card */}
        <div className="px-5 -mt-8 relative z-10">
          <Link href="/my-plan">
            <Card className="shadow-lg border-0 rounded-3xl cursor-pointer bg-white hover:shadow-xl transition-all duration-300">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#4E9F87]/10 rounded-2xl flex items-center justify-center">
                    <Apple className="w-7 h-7 text-[#4E9F87]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800 text-lg">Meu Plano</h2>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                      {isLoading
                        ? "Carregando..."
                        : activePrescription
                        ? activePrescription.name
                        : "Nenhum plano ativo"}
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Services Grid */}
        <div className="px-5 mt-8">
          <h3 className="font-bold text-gray-800 mb-4 ml-1 text-lg">Serviços</h3>
          <div className="grid grid-cols-2 gap-4">
            <MenuCard icon={Apple} title="Meu plano" href="/my-plan" color="text-[#4E9F87]" bgColor="bg-[#4E9F87]/10" />
            <MenuCard icon={TrendingUp} title="Evolução" href="/evolution" color="text-[#3B82F6]" bgColor="bg-[#3B82F6]/10" />
            <MenuCard icon={BookOpen} title="Diário" href="/diary" color="text-[#F59E0B]" bgColor="bg-[#F59E0B]/10" />
            <MenuCard icon={Target} title="Metas" href="/goals" color="text-[#8B5CF6]" bgColor="bg-[#8B5CF6]/10" />
            <MenuCard icon={FlaskConical} title="Exames" href="/exams" color="text-[#06B6D4]" bgColor="bg-[#06B6D4]/10" />
            <MenuCard icon={FileText} title="Orientações" href="/guidelines" color="text-[#64748B]" bgColor="bg-[#64748B]/10" />
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

function MenuCard({
  icon: Icon,
  title,
  href,
  color,
  bgColor,
}: {
  icon: any;
  title: string;
  href: string;
  color: string;
  bgColor: string;
}) {
  return (
    <Link href={href}>
      <Card className="border-0 shadow-sm rounded-3xl cursor-pointer bg-white hover:shadow-md transition-shadow h-full active:scale-95 duration-200">
        <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3 h-36">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-1 ${bgColor}`}>
            <Icon className={`w-7 h-7 ${color}`} />
          </div>
          <span className="font-semibold text-gray-700 text-[15px]">{title}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
