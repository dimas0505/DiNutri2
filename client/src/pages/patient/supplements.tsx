import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Pill, Sparkles, AlertCircle, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Patient } from "@shared/schema";
import { MobileLayout } from "@/components/layout/mobile-layout";

function parseSupplementLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function PatientSupplementsPage() {
  const [, setLocation] = useLocation();

  const { data: patient, isLoading } = useQuery<Patient>({
    queryKey: ["/api/patient/my-profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patient/my-profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    retry: false,
  });

  const lines = patient?.supplements ? parseSupplementLines(patient.supplements) : [];

  return (
    <MobileLayout hideHeader>
      <div className="min-h-screen bg-[#F0F1F7] pb-10">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#EF4444] to-[#DC2626] text-white px-5 pt-[max(14px,env(safe-area-inset-top))] pb-8 rounded-b-[22px] shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLocation("/dashboard")}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Pill className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Suplementos</h1>
                <p className="text-xs text-white/80">Rotina e recomendações</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pt-6 space-y-5">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EF4444]" />
              <p className="text-sm text-[#6C7282]">Carregando recomendações...</p>
            </div>
          )}

          {/* No supplements yet */}
          {!isLoading && lines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-[#FDEBEC] flex items-center justify-center">
                <Pill className="w-10 h-10 text-[#EF4444]/60" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#252638] mb-1">Sem recomendações ainda</h2>
                <p className="text-sm text-[#6C7282] max-w-xs">
                  Seu nutricionista ainda não adicionou recomendações de suplementação para você.
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-100 mt-2 w-full">
                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700 leading-snug">
                  Entre em contato com seu nutricionista para receber orientações personalizadas.
                </p>
              </div>
            </div>
          )}

          {/* Has supplements */}
          {!isLoading && lines.length > 0 && (
            <>
              {/* Intro card */}
              <div className="bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-2xl p-5 shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-5 h-5 text-white/90" />
                  <span className="text-white font-semibold text-sm">Recomendações do seu nutricionista</span>
                </div>
                <p className="text-white/80 text-xs leading-relaxed">
                  Siga as orientações abaixo para obter os melhores resultados com sua suplementação.
                </p>
              </div>

              {/* Supplement list */}
              <div className="bg-white rounded-2xl border border-[#E9E9EF] shadow-[0_2px_8px_rgba(12,12,13,0.04)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#F3F4F6]">
                  <h2 className="text-base font-bold text-[#252638]">Protocolo de Suplementação</h2>
                  <p className="text-xs text-[#6C7282] mt-0.5">{lines.length} item{lines.length !== 1 ? "s" : ""} recomendado{lines.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="divide-y divide-[#F3F4F6]">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#FDEBEC] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-[#EF4444]">{index + 1}</span>
                      </div>
                      <p className="text-sm text-[#252638] font-medium leading-snug flex-1">{line}</p>
                      <ChevronRight className="w-4 h-4 text-[#D1D5DB] flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-3 px-4 py-4 rounded-2xl bg-amber-50 border border-amber-100">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  <span className="font-semibold">Importante:</span> Siga sempre as orientações do seu nutricionista. Não altere doses ou substitua produtos sem consultar o profissional responsável.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
