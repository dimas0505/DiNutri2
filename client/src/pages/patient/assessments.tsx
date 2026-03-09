import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInvalidatePatientData } from "@/hooks/useInvalidatePatientData";
import { Download, FileText, ClipboardList, Percent, Ruler, TrendingUp, Weight } from "lucide-react";
import { Sparkles } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { AnthropometricAssessment, PatientDocument } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type BodyMarker = {
  label: string;
  value: string | number | null | undefined;
  unit: "cm";
  point: { x: number; y: number };
  labelPoint: { x: number; y: number; anchor: "start" | "end" };
};

export default function AssessmentsPage() {
  const invalidatePatientData = useInvalidatePatientData();
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    invalidatePatientData();
  }, [invalidatePatientData]);

  const { data: documents, isLoading: documentsLoading } = useQuery<PatientDocument[]>({
    queryKey: ["/api/my-assessments"],
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

  const handleDownload = async (url: string, filename: string, id: string) => {
    setDownloadingId(id);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Falha ao baixar o arquivo.");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("[Download] Erro ao baixar arquivo:", error);
      toast({ variant: "destructive", title: "Erro no download", description: "Não foi possível baixar o arquivo. Tente novamente." });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const circumferenceItems = latestAnthro
    ? [
        { label: "Pescoço", value: latestAnthro.circumNeck, unit: "cm" },
        { label: "Tórax", value: latestAnthro.circumChest, unit: "cm" },
        { label: "Cintura", value: latestAnthro.circumWaist, unit: "cm" },
        { label: "Abdômen", value: latestAnthro.circumAbdomen, unit: "cm" },
        { label: "Quadril", value: latestAnthro.circumHip, unit: "cm" },
        { label: "Braço n. dom. relaxado", value: latestAnthro.circumNonDominantArmRelaxed, unit: "cm" },
        { label: "Braço n. dom. contraído", value: latestAnthro.circumNonDominantArmContracted, unit: "cm" },
        { label: "Coxa proximal n. dom.", value: latestAnthro.circumNonDominantProximalThigh, unit: "cm" },
        { label: "Panturrilha n. dom.", value: latestAnthro.circumNonDominantCalf, unit: "cm" },
      ].filter((item) => item.value != null)
    : [];

  const foldItems = latestAnthro
    ? [
        { label: "Bicipital", value: latestAnthro.foldBiceps, unit: "mm" },
        { label: "Tricipital", value: latestAnthro.foldTriceps, unit: "mm" },
        { label: "Subescapular", value: latestAnthro.foldSubscapular, unit: "mm" },
        { label: "Suprailíaca", value: latestAnthro.foldSuprailiac, unit: "mm" },
      ].filter((item) => item.value != null)
    : [];

  const bodyMarkers: BodyMarker[] = latestAnthro
    ? [
        { label: "Pescoço", value: latestAnthro.circumNeck, unit: "cm" as const, point: { x: 160, y: 110 }, labelPoint: { x: 60, y: 95, anchor: "end" as const } },
        { label: "Tórax", value: latestAnthro.circumChest, unit: "cm" as const, point: { x: 160, y: 165 }, labelPoint: { x: 262, y: 150, anchor: "start" as const } },
        { label: "Cintura", value: latestAnthro.circumWaist, unit: "cm" as const, point: { x: 160, y: 235 }, labelPoint: { x: 60, y: 225, anchor: "end" as const } },
        { label: "Abdômen", value: latestAnthro.circumAbdomen, unit: "cm" as const, point: { x: 160, y: 268 }, labelPoint: { x: 262, y: 255, anchor: "start" as const } },
        { label: "Quadril", value: latestAnthro.circumHip, unit: "cm" as const, point: { x: 160, y: 305 }, labelPoint: { x: 60, y: 295, anchor: "end" as const } },
        { label: "Braço", value: latestAnthro.circumNonDominantArmRelaxed, unit: "cm" as const, point: { x: 116, y: 188 }, labelPoint: { x: 48, y: 172, anchor: "end" as const } },
        { label: "Coxa", value: latestAnthro.circumNonDominantProximalThigh, unit: "cm" as const, point: { x: 140, y: 375 }, labelPoint: { x: 262, y: 362, anchor: "start" as const } },
        { label: "Panturrilha", value: latestAnthro.circumNonDominantCalf, unit: "cm" as const, point: { x: 140, y: 455 }, labelPoint: { x: 52, y: 440, anchor: "end" as const } },
      ].filter((item) => item.value != null)
    : [];

  return (
    <MobileLayout title="Minhas Avaliações" showBackButton>
      <div className="p-4 space-y-4">
        <Tabs defaultValue="anthro" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-11 rounded-xl bg-purple-50 p-1 gap-1">
            <TabsTrigger value="anthro" className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=inactive]:text-purple-400">
              Antropometria
            </TabsTrigger>
            <TabsTrigger value="bodymap" className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=inactive]:text-purple-400">
              Mapa Tech
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=inactive]:text-purple-400">
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anthro" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">Última avaliação antropométrica registrada pelo seu nutricionista.</p>
            {anthroLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : !latestAnthro ? (
              <Card className="border border-border/70">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Ruler className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium">Nenhuma avaliação antropométrica disponível</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Seu nutricionista irá registrar suas medidas em breve.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-5">
                <Card className="border border-gray-100 shadow-sm">
                  <CardContent className="px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-purple-600" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avaliação</p>
                        <p className="text-sm font-semibold text-foreground leading-tight">{latestAnthro.title}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border border-purple-100 font-medium">{latestAnthro.createdAt ? new Date(latestAnthro.createdAt).toLocaleDateString("pt-BR") : ""}</Badge>
                  </CardContent>
                </Card>

                {latestAnthro.weightKg != null && (
                  <Card className="border border-border/70 shadow-sm">
                    <CardContent className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2"><Weight className="h-4 w-4 text-purple-600" /><p className="text-sm font-medium">Peso registrado</p></div>
                      <p className="text-lg font-bold text-foreground">{latestAnthro.weightKg} kg</p>
                    </CardContent>
                  </Card>
                )}

                {circumferenceItems.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">Circunferências</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {circumferenceItems.map((item) => (
                        <Card key={item.label} className="border border-gray-100 shadow-sm">
                          <CardContent className="px-3.5 py-3">
                            <p className="text-[11px] text-muted-foreground leading-tight mb-1">{item.label}</p>
                            <p className="text-base font-bold text-foreground leading-none">{item.value}<span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span></p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {foldItems.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">Dobras Cutâneas</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {foldItems.map((item) => (
                        <Card key={item.label} className="border border-gray-100 shadow-sm">
                          <CardContent className="px-3.5 py-3">
                            <p className="text-[11px] text-muted-foreground leading-tight mb-1">{item.label}</p>
                            <p className="text-base font-bold text-foreground leading-none">{item.value}<span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span></p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {latestAnthro.manualBodyFatPercent != null && !Number.isNaN(latestAnthro.manualBodyFatPercent) && (
                  <Card className="overflow-hidden border-0 shadow-sm" style={{ background: "linear-gradient(135deg, #F97316 0%, #FBBF24 100%)" }}>
                    <CardContent className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2"><div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><Percent className="h-4 w-4 text-white" /></div><p className="text-white font-bold text-xs uppercase tracking-wide">% Gordura Corporal</p></div>
                      <div className="flex items-end justify-between">
                        <p className="text-white font-bold text-4xl leading-none">{latestAnthro.manualBodyFatPercent}<span className="text-xl font-normal ml-0.5">%</span></p>
                        {latestAnthro.manualBodyFatClassification && <p className="text-white font-semibold text-sm text-right">{latestAnthro.manualBodyFatClassification}</p>}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bodymap" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">Visão tecnológica das medidas da sua última avaliação, com pontos destacados no corpo.</p>
            {anthroLoading ? (
              <Skeleton className="h-[560px] w-full rounded-2xl" />
            ) : !latestAnthro ? (
              <Card className="border border-border/70">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium">Mapa corporal indisponível</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Assim que houver avaliação antropométrica, exibiremos o mapa interativo.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-cyan-200/60 shadow-md bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-cyan-300/20">
                    <div className="flex items-center gap-2 text-cyan-200">
                      <Sparkles className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-widest">Body Scan</p>
                    </div>
                    <Badge className="bg-cyan-500/15 text-cyan-100 border-cyan-300/40">{latestAnthro.createdAt ? new Date(latestAnthro.createdAt).toLocaleDateString("pt-BR") : "Recente"}</Badge>
                  </div>

                  <div className="p-3">
                    <svg viewBox="0 0 320 520" className="w-full h-auto">
                      <defs>
                        <linearGradient id="holo" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.95" />
                          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.75" />
                        </linearGradient>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="2.5" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      <circle cx="160" cy="62" r="30" fill="none" stroke="url(#holo)" strokeWidth="2.2" opacity="0.95" />
                      <path d="M140 95 Q160 82 180 95 L192 138 Q195 150 186 164 L178 208 L182 244 Q184 267 176 292 L170 336 L176 470 M128 470 L134 336 Q136 300 128 260 L140 210 L133 165 Q125 150 128 138 L140 95 Z" fill="none" stroke="url(#holo)" strokeWidth="2" filter="url(#glow)" />
                      <path d="M128 158 L96 232 L106 239 L139 174 M192 158 L224 232 L214 239 L181 174" fill="none" stroke="url(#holo)" strokeWidth="2" filter="url(#glow)" opacity="0.9" />
                      <path d="M140 332 L122 430 L128 470 M180 332 L198 430 L192 470" fill="none" stroke="url(#holo)" strokeWidth="2" filter="url(#glow)" />

                      {bodyMarkers.map((marker) => (
                        <g key={marker.label}>
                          <line x1={marker.point.x} y1={marker.point.y} x2={marker.labelPoint.x} y2={marker.labelPoint.y} stroke="#67E8F9" strokeOpacity="0.85" strokeWidth="1.4" strokeDasharray="4 3" />
                          <circle cx={marker.point.x} cy={marker.point.y} r="3.4" fill="#67E8F9" />
                          <circle cx={marker.point.x} cy={marker.point.y} r="8.5" fill="none" stroke="#67E8F9" strokeOpacity="0.35" />
                          <text x={marker.labelPoint.x} y={marker.labelPoint.y - 4} textAnchor={marker.labelPoint.anchor} fill="#CFFAFE" fontSize="10" style={{ letterSpacing: "0.6px" }}>
                            {marker.label.toUpperCase()}
                          </text>
                          <text x={marker.labelPoint.x} y={marker.labelPoint.y + 10} textAnchor={marker.labelPoint.anchor} fill="#FFFFFF" fontSize="13" fontWeight="700">
                            {marker.value} {marker.unit}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">Arquivos e avaliações enviados pelo seu nutricionista.</p>
            {documentsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : !documents || documents.length === 0 ? (
              <Card className="border border-border/70">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium">Nenhuma avaliação disponível</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Seu nutricionista ainda não enviou avaliações.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <Card key={doc.id} className="border border-border/70 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold truncate">{doc.fileName}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">Enviado em {formatDate(doc.createdAt)}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-1">
                      <Button size="sm" className="w-full gap-2" disabled={downloadingId === doc.id} onClick={() => handleDownload(doc.fileUrl, doc.fileName, doc.id)}>
                        <Download className="h-4 w-4" />
                        {downloadingId === doc.id ? "Baixando..." : "Download"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
