import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Leaf, Sparkles } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import type { Patient } from "@shared/schema";

export default function SupplementsPage() {
  const { data: patientProfile, isLoading } = useQuery<Patient>({
    queryKey: ["/api/patient/my-profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patient/my-profile");
      return res.json();
    },
  });

  const recommendations = patientProfile?.supplementRecommendations;

  return (
    <MobileLayout title="Suplementos" showBackButton>
      <div className="px-4 pb-8 pt-2 space-y-5">
        {/* Header card */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Suplementos</h1>
              <p className="text-sm text-emerald-100">Recomendações do seu nutricionista</p>
            </div>
          </div>
          <p className="text-xs text-emerald-100 mt-2 leading-snug">
            Siga as orientações abaixo com atenção. Em caso de dúvidas, consulte seu nutricionista.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3 rounded-xl" />
            <Skeleton className="h-4 w-full rounded-xl" />
            <Skeleton className="h-4 w-full rounded-xl" />
            <Skeleton className="h-4 w-4/5 rounded-xl" />
          </div>
        ) : recommendations ? (
          <div className="rounded-2xl bg-white border border-emerald-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 border-b border-emerald-100">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-700">Recomendações Personalizadas</span>
            </div>
            <div className="p-5">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {recommendations}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <Leaf className="w-8 h-8 text-emerald-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">Sem recomendações ainda</h3>
            <p className="text-sm text-gray-400 max-w-xs leading-snug">
              Seu nutricionista ainda não inseriu recomendações de suplementos. Consulte-o para mais informações.
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
