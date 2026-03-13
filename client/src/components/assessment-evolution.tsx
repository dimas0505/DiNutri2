/**
 * AssessmentEvolution
 *
 * Componente de visualização da evolução das avaliações antropométricas.
 *
 * Funcionalidades:
 * - Gráfico de linha para evolução do peso ao longo do tempo
 * - Gráfico de área para % de gordura corporal
 * - Cards de comparação com indicadores delta (↑↓) entre última e penúltima avaliação
 * - Gráfico de barras horizontais para circunferências e dobras cutâneas
 * - Suporte a múltiplas avaliações com navegação por período
 *
 * Usa Recharts (já instalado) e Framer Motion para animações.
 * Zero dependências novas.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Weight,
  Percent,
  Ruler,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AnthropometricAssessment } from "@shared/schema";

interface AssessmentEvolutionProps {
  history: AnthropometricAssessment[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatDateFull(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

type DeltaDirection = "up" | "down" | "neutral";

function getDelta(
  current: number | null | undefined,
  previous: number | null | undefined
): { value: number | null; direction: DeltaDirection } {
  if (current == null || previous == null) return { value: null, direction: "neutral" };
  const diff = parseFloat((current - previous).toFixed(2));
  return {
    value: diff,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
  };
}

// ─── Delta Card ─────────────────────────────────────────────────────────────

interface DeltaCardProps {
  label: string;
  current: number | null | undefined;
  previous: number | null | undefined;
  unit: string;
  icon: React.ReactNode;
  positiveIsGood?: boolean; // se true, aumento é verde; se false, aumento é vermelho
  gradient: string;
}

function DeltaCard({
  label,
  current,
  previous,
  unit,
  icon,
  positiveIsGood = false,
  gradient,
}: DeltaCardProps) {
  const delta = getDelta(current, previous);

  const deltaColor =
    delta.direction === "neutral"
      ? "text-gray-400"
      : delta.direction === "up"
      ? positiveIsGood
        ? "text-emerald-500"
        : "text-rose-500"
      : positiveIsGood
      ? "text-rose-500"
      : "text-emerald-500";

  const DeltaIcon =
    delta.direction === "up"
      ? TrendingUp
      : delta.direction === "down"
      ? TrendingDown
      : Minus;

  if (current == null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card className="overflow-hidden border-0 shadow-md">
        <div className={`h-1.5 w-full ${gradient}`} />
        <CardContent className="px-4 py-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
              {icon}
            </div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-foreground leading-none">
              {current}
              <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
            </p>
            {delta.value !== null && (
              <div className={`flex items-center gap-0.5 ${deltaColor}`}>
                <DeltaIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">
                  {delta.value > 0 ? "+" : ""}
                  {delta.value} {unit}
                </span>
              </div>
            )}
          </div>
          {previous != null && (
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Anterior: {previous} {unit}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color: string }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color: payload[0].color }}>
        {payload[0].value} {unit}
      </p>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-xs font-bold text-foreground uppercase tracking-widest">{title}</p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AssessmentEvolution({ history }: AssessmentEvolutionProps) {
  // Ordena do mais antigo para o mais recente
  const sorted = useMemo(
    () => [...history].sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()),
    [history]
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

  // ── Dados para gráfico de peso ──────────────────────────────────────────
  const weightData = useMemo(
    () =>
      sorted
        .filter((a) => a.weightKg != null)
        .map((a) => ({
          date: formatDate(a.createdAt),
          dateFull: formatDateFull(a.createdAt),
          peso: a.weightKg,
          title: a.title,
        })),
    [sorted]
  );

  // ── Dados para gráfico de % gordura ────────────────────────────────────
  const fatData = useMemo(
    () =>
      sorted
        .filter((a) => a.manualBodyFatPercent != null && !Number.isNaN(a.manualBodyFatPercent))
        .map((a) => ({
          date: formatDate(a.createdAt),
          dateFull: formatDateFull(a.createdAt),
          gordura: a.manualBodyFatPercent,
          title: a.title,
        })),
    [sorted]
  );

  // ── Dados para gráfico de circunferências (comparação últimas 2) ────────
  const circumData = useMemo(() => {
    if (!latest) return [];
    const items = [
      { label: "Pescoço", key: "circumNeck" as const },
      { label: "Cintura", key: "circumWaist" as const },
      { label: "Abdômen", key: "circumAbdomen" as const },
      { label: "Quadril", key: "circumHip" as const },
      { label: "Tórax", key: "circumChest" as const },
      { label: "Braço", key: "circumNonDominantArmContracted" as const },
      { label: "Coxa", key: "circumNonDominantProximalThigh" as const },
      { label: "Panturrilha", key: "circumNonDominantCalf" as const },
    ];
    return items
      .filter((item) => latest[item.key] != null)
      .map((item) => ({
        label: item.label,
        atual: latest[item.key],
        anterior: previous ? previous[item.key] : null,
      }));
  }, [latest, previous]);

  // ── Dados para gráfico de dobras cutâneas ───────────────────────────────
  const foldData = useMemo(() => {
    if (!latest) return [];
    const items = [
      { label: "Bicipital", key: "foldBiceps" as const },
      { label: "Tricipital", key: "foldTriceps" as const },
      { label: "Subescapular", key: "foldSubscapular" as const },
      { label: "Suprailíaca", key: "foldSuprailiac" as const },
    ];
    return items
      .filter((item) => latest[item.key] != null)
      .map((item) => ({
        label: item.label,
        atual: latest[item.key],
        anterior: previous ? previous[item.key] : null,
      }));
  }, [latest, previous]);

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!latest) {
    return (
      <Card className="border border-border/70">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground font-medium">Nenhuma avaliação disponível</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Seu nutricionista irá registrar suas medidas para ativar a evolução.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Single assessment state ─────────────────────────────────────────────
  if (sorted.length === 1) {
    return (
      <div className="space-y-4">
        <Card className="border border-purple-100 bg-purple-50/40">
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Primeira avaliação registrada</p>
              <p className="text-xs text-muted-foreground">
                {formatDateFull(latest.createdAt)} — {latest.title}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <TrendingUp className="h-10 w-10 text-purple-300 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Aguardando próxima avaliação
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Os gráficos de evolução serão exibidos após a segunda avaliação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header de resumo ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">Sua evolução</p>
          <p className="text-xs text-muted-foreground">
            {sorted.length} avaliação{sorted.length > 1 ? "ões" : ""} registrada{sorted.length > 1 ? "s" : ""}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="text-xs bg-purple-50 text-purple-700 border border-purple-100 font-medium"
        >
          Última: {formatDate(latest.createdAt)}
        </Badge>
      </motion.div>

      {/* ── Cards de comparação (delta) ──────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<TrendingUp className="h-3.5 w-3.5 text-purple-600" />}
          title="Comparação com avaliação anterior"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <DeltaCard
            label="Peso"
            current={latest.weightKg}
            previous={previous?.weightKg}
            unit="kg"
            icon={<Weight className="h-3.5 w-3.5 text-blue-500" />}
            positiveIsGood={false}
            gradient="bg-gradient-to-r from-blue-400 to-blue-600"
          />
          <DeltaCard
            label="% Gordura"
            current={latest.manualBodyFatPercent}
            previous={previous?.manualBodyFatPercent}
            unit="%"
            icon={<Percent className="h-3.5 w-3.5 text-orange-500" />}
            positiveIsGood={false}
            gradient="bg-gradient-to-r from-orange-400 to-amber-500"
          />
          <DeltaCard
            label="Cintura"
            current={latest.circumWaist}
            previous={previous?.circumWaist}
            unit="cm"
            icon={<Ruler className="h-3.5 w-3.5 text-purple-500" />}
            positiveIsGood={false}
            gradient="bg-gradient-to-r from-purple-400 to-purple-600"
          />
          <DeltaCard
            label="Quadril"
            current={latest.circumHip}
            previous={previous?.circumHip}
            unit="cm"
            icon={<Ruler className="h-3.5 w-3.5 text-pink-500" />}
            positiveIsGood={false}
            gradient="bg-gradient-to-r from-pink-400 to-rose-500"
          />
        </div>
      </div>

      {/* ── Gráfico de peso ──────────────────────────────────────────────── */}
      {weightData.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <SectionHeader
            icon={<Weight className="h-3.5 w-3.5 text-blue-500" />}
            title="Evolução do Peso"
          />
          <Card className="border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weightData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <CustomTooltip active={active} payload={payload as any} label={label} unit="kg" />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="peso"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fill="url(#weightGrad)"
                    dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Gráfico de % gordura ─────────────────────────────────────────── */}
      {fatData.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <SectionHeader
            icon={<Percent className="h-3.5 w-3.5 text-orange-500" />}
            title="Evolução da Gordura Corporal"
          />
          <Card className="border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={fatData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <CustomTooltip active={active} payload={payload as any} label={label} unit="%" />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="gordura"
                    stroke="#F97316"
                    strokeWidth={2.5}
                    fill="url(#fatGrad)"
                    dot={{ r: 4, fill: "#F97316", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#F97316", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Gráfico de circunferências ───────────────────────────────────── */}
      {circumData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <SectionHeader
            icon={<Ruler className="h-3.5 w-3.5 text-purple-600" />}
            title="Circunferências (cm)"
          />
          <Card className="border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height={circumData.length * 38 + 20}>
                <BarChart
                  data={circumData}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 60, bottom: 0 }}
                  barSize={10}
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 shadow-lg">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          {payload.map((p: any) => (
                            <p key={p.name} className="text-xs font-semibold" style={{ color: p.fill }}>
                              {p.name === "atual" ? "Atual" : "Anterior"}: {p.value} cm
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {previous && (
                    <Bar dataKey="anterior" name="anterior" fill="#C4B5FD" radius={[0, 4, 4, 0]} />
                  )}
                  <Bar dataKey="atual" name="atual" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {previous && (
                <div className="flex items-center gap-4 justify-center mt-2 pb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#8B5CF6]" />
                    <span className="text-[10px] text-muted-foreground">Atual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#C4B5FD]" />
                    <span className="text-[10px] text-muted-foreground">Anterior</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Gráfico de dobras cutâneas ───────────────────────────────────── */}
      {foldData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <SectionHeader
            icon={<Activity className="h-3.5 w-3.5 text-rose-500" />}
            title="Dobras Cutâneas (mm)"
          />
          <Card className="border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height={foldData.length * 38 + 20}>
                <BarChart
                  data={foldData}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 72, bottom: 0 }}
                  barSize={10}
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 shadow-lg">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          {payload.map((p: any) => (
                            <p key={p.name} className="text-xs font-semibold" style={{ color: p.fill }}>
                              {p.name === "atual" ? "Atual" : "Anterior"}: {p.value} mm
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {previous && (
                    <Bar dataKey="anterior" name="anterior" fill="#FECDD3" radius={[0, 4, 4, 0]} />
                  )}
                  <Bar dataKey="atual" name="atual" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {previous && (
                <div className="flex items-center gap-4 justify-center mt-2 pb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#F43F5E]" />
                    <span className="text-[10px] text-muted-foreground">Atual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#FECDD3]" />
                    <span className="text-[10px] text-muted-foreground">Anterior</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Timeline de avaliações ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <SectionHeader
          icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
          title="Histórico de Avaliações"
        />
        <div className="relative pl-5">
          {/* Linha vertical */}
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-purple-300 via-purple-200 to-transparent rounded-full" />
          <div className="space-y-3">
            {[...sorted].reverse().map((assessment, idx) => (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="relative"
              >
                {/* Dot na linha */}
                <div
                  className={`absolute -left-3.5 top-3.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                    idx === 0 ? "bg-purple-600" : "bg-purple-200"
                  }`}
                />
                <Card
                  className={`border shadow-sm ml-1 ${
                    idx === 0
                      ? "border-purple-200 bg-purple-50/50"
                      : "border-gray-100"
                  }`}
                >
                  <CardContent className="px-3.5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {assessment.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateFull(assessment.createdAt)}
                        </p>
                      </div>
                      {idx === 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-purple-100 text-purple-700 border-0 shrink-0"
                        >
                          Mais recente
                        </Badge>
                      )}
                    </div>
                    {/* Mini resumo de métricas */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {assessment.weightKg != null && (
                        <span className="text-[11px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                          {assessment.weightKg} kg
                        </span>
                      )}
                      {assessment.manualBodyFatPercent != null && (
                        <span className="text-[11px] bg-orange-50 text-orange-700 rounded-full px-2 py-0.5 font-medium">
                          {assessment.manualBodyFatPercent}% gordura
                        </span>
                      )}
                      {assessment.circumWaist != null && (
                        <span className="text-[11px] bg-purple-50 text-purple-700 rounded-full px-2 py-0.5 font-medium">
                          Cintura: {assessment.circumWaist} cm
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
