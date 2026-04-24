import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Calendar,
  Percent,
  Ruler,
  Weight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnthropometricAssessment } from "@shared/schema";

interface AssessmentEvolutionProps {
  history: AnthropometricAssessment[];
}

type NumericMetricKey =
  | "weightKg"
  | "manualBodyFatPercent"
  | "circumWaist"
  | "circumHip"
  | "circumAbdomen"
  | "circumChest"
  | "circumNeck"
  | "circumNonDominantArmContracted"
  | "circumNonDominantProximalThigh"
  | "circumNonDominantCalf"
  | "foldBiceps"
  | "foldTriceps"
  | "foldSubscapular"
  | "foldSuprailiac";

interface MetricDefinition {
  key: NumericMetricKey;
  label: string;
  unit: "kg" | "%" | "cm" | "mm";
  showPercentDiff?: boolean;
}

const METRIC_DEFINITIONS: MetricDefinition[] = [
  { key: "weightKg", label: "Peso", unit: "kg", showPercentDiff: true },
  { key: "manualBodyFatPercent", label: "% Gordura", unit: "%", showPercentDiff: true },
  { key: "circumWaist", label: "Cintura", unit: "cm", showPercentDiff: true },
  { key: "circumHip", label: "Quadril", unit: "cm", showPercentDiff: true },
  { key: "circumAbdomen", label: "Abdômen", unit: "cm", showPercentDiff: true },
  { key: "circumChest", label: "Tórax", unit: "cm", showPercentDiff: true },
  { key: "circumNeck", label: "Pescoço", unit: "cm", showPercentDiff: true },
  { key: "circumNonDominantArmContracted", label: "Braço (contraído)", unit: "cm", showPercentDiff: true },
  { key: "circumNonDominantProximalThigh", label: "Coxa (proximal)", unit: "cm", showPercentDiff: true },
  { key: "circumNonDominantCalf", label: "Panturrilha", unit: "cm", showPercentDiff: true },
  { key: "foldBiceps", label: "Dobra Bicipital", unit: "mm" },
  { key: "foldTriceps", label: "Dobra Tricipital", unit: "mm" },
  { key: "foldSubscapular", label: "Dobra Subescapular", unit: "mm" },
  { key: "foldSuprailiac", label: "Dobra Suprailíaca", unit: "mm" },
];

function toValidNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function toTimestamp(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Data não informada";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Data inválida";
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "Data não informada";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Data inválida";
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatNumber(value: number, maxFractionDigits = 1): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function getDayDiff(start: Date | string | null | undefined, end: Date | string | null | undefined): number | null {
  const startTs = toTimestamp(start);
  const endTs = toTimestamp(end);
  if (!startTs || !endTs || endTs < startTs) return null;
  return Math.round((endTs - startTs) / (1000 * 60 * 60 * 24));
}

function getVariation(current: number | null, previous: number | null) {
  if (current == null || previous == null) {
    return { absolute: null, percent: null as number | null, trend: "Sem comparação" };
  }

  const absolute = Number((current - previous).toFixed(2));
  const percent = previous === 0 ? null : Number((((current - previous) / previous) * 100).toFixed(2));
  const trend = absolute === 0 ? "Sem alteração" : absolute > 0 ? "Aumento" : "Redução";

  return { absolute, percent, trend };
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">{icon}</div>
        <p className="text-xs font-bold text-foreground uppercase tracking-widest">{title}</p>
      </div>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function SingleMetricLegend({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center justify-center pb-1">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2 py-1 text-[10px] text-muted-foreground">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
    </div>
  );
}

function ComparisonBadge({ label, value, variant = "outline" }: { label: string; value: string; variant?: "outline" | "secondary" }) {
  return (
    <Badge variant={variant} className="text-[10px] font-medium px-2.5 py-1">
      <span className="text-muted-foreground mr-1">{label}:</span>
      <span>{value}</span>
    </Badge>
  );
}

export function AssessmentEvolution({ history }: AssessmentEvolutionProps) {
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt)),
    [history]
  );

  const firstAssessment = sortedHistory[0] ?? null;
  const latestAssessment = sortedHistory[sortedHistory.length - 1] ?? null;

  const [fromId, setFromId] = useState<string>(firstAssessment?.id ?? "");
  const [toId, setToId] = useState<string>(latestAssessment?.id ?? "");

  useEffect(() => {
    setFromId(firstAssessment?.id ?? "");
    setToId(latestAssessment?.id ?? "");
  }, [firstAssessment?.id, latestAssessment?.id]);

  const fromIndex = sortedHistory.findIndex((item) => item.id === fromId);
  const toIndex = sortedHistory.findIndex((item) => item.id === toId);

  const safeFromIndex = fromIndex >= 0 ? fromIndex : 0;
  const safeToIndex = toIndex >= 0 ? toIndex : Math.max(sortedHistory.length - 1, 0);

  const compareStartIndex = Math.min(safeFromIndex, safeToIndex);
  const compareEndIndex = Math.max(safeFromIndex, safeToIndex);

  const comparisonStart = sortedHistory[compareStartIndex] ?? null;
  const comparisonEnd = sortedHistory[compareEndIndex] ?? null;

  const dayInterval = getDayDiff(firstAssessment?.createdAt, latestAssessment?.createdAt);

  const comparisonMetrics = useMemo(() => {
    if (!comparisonStart || !comparisonEnd) return [];

    return METRIC_DEFINITIONS
      .map((metric) => {
        const startValue = toValidNumber(comparisonStart[metric.key]);
        const endValue = toValidNumber(comparisonEnd[metric.key]);
        if (startValue == null || endValue == null) return null;

        const variation = getVariation(endValue, startValue);

        return {
          ...metric,
          startValue,
          endValue,
          variation,
        };
      })
      .filter((metric): metric is NonNullable<typeof metric> => metric !== null);
  }, [comparisonStart, comparisonEnd]);

  const weightData = useMemo(
    () =>
      sortedHistory
        .map((assessment) => ({
          date: formatDate(assessment.createdAt),
          dateLong: formatDateLong(assessment.createdAt),
          title: assessment.title,
          value: toValidNumber(assessment.weightKg),
        }))
        .filter((point) => point.value != null),
    [sortedHistory]
  );

  const fatData = useMemo(
    () =>
      sortedHistory
        .map((assessment) => ({
          date: formatDate(assessment.createdAt),
          dateLong: formatDateLong(assessment.createdAt),
          title: assessment.title,
          value: toValidNumber(assessment.manualBodyFatPercent),
        }))
        .filter((point) => point.value != null),
    [sortedHistory]
  );

  const circumferenceData = useMemo(() => {
    if (!comparisonEnd) return [];

    return METRIC_DEFINITIONS
      .filter((metric) => metric.unit === "cm")
      .map((metric) => {
        const endValue = toValidNumber(comparisonEnd[metric.key]);
        const startValue = comparisonStart ? toValidNumber(comparisonStart[metric.key]) : null;
        if (endValue == null) return null;

        return {
          label: metric.label,
          atual: endValue,
          inicial: startValue,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [comparisonEnd, comparisonStart]);

  const foldData = useMemo(() => {
    if (!comparisonEnd) return [];

    return METRIC_DEFINITIONS
      .filter((metric) => metric.unit === "mm")
      .map((metric) => {
        const endValue = toValidNumber(comparisonEnd[metric.key]);
        const startValue = comparisonStart ? toValidNumber(comparisonStart[metric.key]) : null;
        if (endValue == null) return null;

        return {
          label: metric.label.replace("Dobra ", ""),
          atual: endValue,
          inicial: startValue,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [comparisonEnd, comparisonStart]);

  if (!latestAssessment) {
    return (
      <Card className="border border-border/70 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground font-medium">Você ainda não possui avaliações registradas.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Assim que uma avaliação for cadastrada, sua evolução será exibida aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (sortedHistory.length === 1) {
    return (
      <div className="space-y-4">
        <Card className="border border-purple-100 bg-purple-50/40 shadow-sm">
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Primeira avaliação registrada</p>
              <p className="text-xs text-muted-foreground">
                {formatDateLong(latestAssessment.createdAt)} — {latestAssessment.title}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <ArrowRightLeft className="h-10 w-10 text-purple-300 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Você possui uma avaliação registrada.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              A comparação de evolução será exibida após uma nova avaliação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-2.5"
      >
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-3.5">
            <p className="text-[11px] text-muted-foreground">Total de avaliações</p>
            <p className="text-lg font-bold text-foreground">{sortedHistory.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-3.5">
            <p className="text-[11px] text-muted-foreground">Primeira avaliação</p>
            <p className="text-sm font-semibold leading-tight">{formatDate(firstAssessment?.createdAt)}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-3.5">
            <p className="text-[11px] text-muted-foreground">Última avaliação</p>
            <p className="text-sm font-semibold leading-tight">{formatDate(latestAssessment?.createdAt)}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-3.5">
            <p className="text-[11px] text-muted-foreground">Período acompanhado</p>
            <p className="text-sm font-semibold leading-tight">
              {dayInterval == null ? "Não disponível" : `${dayInterval} dia${dayInterval === 1 ? "" : "s"}`}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Card className="border border-purple-100 bg-purple-50/30 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <SectionHeader
            icon={<ArrowRightLeft className="h-3.5 w-3.5 text-purple-600" />}
            title="Comparação entre avaliações"
            subtitle="Padrão: primeira avaliação até a última avaliação registrada."
          />

          <div className="flex flex-wrap gap-2">
            <ComparisonBadge label="Inicial" value={formatDate(comparisonStart?.createdAt)} />
            <ComparisonBadge label="Final" value={formatDate(comparisonEnd?.createdAt)} variant="secondary" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Comparar de</Label>
              <Select value={comparisonStart?.id ?? ""} onValueChange={setFromId}>
                <SelectTrigger className="bg-background/80">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sortedHistory.map((assessment) => (
                    <SelectItem key={assessment.id} value={assessment.id}>
                      {formatDate(assessment.createdAt)} • {assessment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Comparar até</Label>
              <Select value={comparisonEnd?.id ?? ""} onValueChange={setToId}>
                <SelectTrigger className="bg-background/80">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sortedHistory.map((assessment) => (
                    <SelectItem key={assessment.id} value={assessment.id}>
                      {formatDate(assessment.createdAt)} • {assessment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {safeFromIndex > safeToIndex && (
            <p className="text-xs text-amber-600">
              A ordem foi ajustada automaticamente para manter uma comparação cronológica válida.
            </p>
          )}

          <div className="text-xs text-muted-foreground">
            Comparativo entre <strong>{formatDateLong(comparisonStart?.createdAt)}</strong> e{" "}
            <strong>{formatDateLong(comparisonEnd?.createdAt)}</strong>.
          </div>
        </CardContent>
      </Card>

      <div>
        <SectionHeader
          icon={<Activity className="h-3.5 w-3.5 text-indigo-600" />}
          title="Variação por métrica"
          subtitle="Exibe apenas métricas com valor inicial e final válidos no intervalo selecionado."
        />
        {comparisonMetrics.length === 0 ? (
          <Card className="border border-border/70 shadow-sm">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Não há métricas numéricas completas para comparar nesse intervalo.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {comparisonMetrics.map((metric) => {
              const trendIcon =
                metric.variation.absolute == null || metric.variation.absolute === 0 ? (
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                ) : metric.variation.absolute > 0 ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                );

              const trendClasses =
                metric.variation.absolute == null || metric.variation.absolute === 0
                  ? "bg-slate-100 text-slate-700"
                  : metric.variation.absolute > 0
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700";

              return (
                <Card key={metric.key} className="border border-gray-100 shadow-sm">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{metric.label}</p>
                      <Badge className={`text-[10px] border-0 ${trendClasses}`}>{metric.variation.trend}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Inicial</p>
                        <p className="font-semibold">
                          {formatNumber(metric.startValue)} {metric.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Final</p>
                        <p className="font-semibold">
                          {formatNumber(metric.endValue)} {metric.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Variação</p>
                        <p className="font-semibold flex items-center gap-1">
                          {trendIcon}
                          {metric.variation.absolute != null
                            ? `${metric.variation.absolute > 0 ? "+" : ""}${formatNumber(metric.variation.absolute)} ${metric.unit}`
                            : "—"}
                        </p>
                        {metric.showPercentDiff && metric.variation.percent != null && (
                          <p className="text-[11px] text-muted-foreground">
                            {metric.variation.percent > 0 ? "+" : ""}
                            {formatNumber(metric.variation.percent, 2)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {weightData.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <SectionHeader
            icon={<Weight className="h-3.5 w-3.5 text-blue-500" />}
            title="Evolução do Peso"
            subtitle="Linha temporal de peso (kg) em ordem cronológica."
          />
          <Card className="border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={weightData} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0]?.payload;
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 shadow-lg">
                          <p className="text-xs text-muted-foreground">{point.dateLong}</p>
                          <p className="text-[11px] text-muted-foreground mb-0.5">{point.title}</p>
                          <p className="text-xs text-muted-foreground">Métrica: Peso</p>
                          <p className="text-sm font-bold text-blue-600">{formatNumber(point.value)} kg</p>
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Peso"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fill="url(#weightGrad)"
                    dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <SingleMetricLegend label="Peso" color="#3B82F6" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {fatData.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <SectionHeader
            icon={<Percent className="h-3.5 w-3.5 text-orange-500" />}
            title="Evolução da Gordura Corporal"
            subtitle="Linha temporal do percentual de gordura (%)."
          />
          <Card className="border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={fatData} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
                  <defs>
                    <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0]?.payload;
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 shadow-lg">
                          <p className="text-xs text-muted-foreground">{point.dateLong}</p>
                          <p className="text-[11px] text-muted-foreground mb-0.5">{point.title}</p>
                          <p className="text-xs text-muted-foreground">Métrica: % Gordura</p>
                          <p className="text-sm font-bold text-orange-600">{formatNumber(point.value)}%</p>
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="% Gordura"
                    stroke="#F97316"
                    strokeWidth={2.5}
                    fill="url(#fatGrad)"
                    dot={{ r: 4, fill: "#F97316", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#F97316", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <SingleMetricLegend label="% Gordura" color="#F97316" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {circumferenceData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <SectionHeader
            icon={<Ruler className="h-3.5 w-3.5 text-purple-600" />}
            title="Circunferências (cm)"
            subtitle="Comparação por medida entre a avaliação inicial e final selecionadas."
          />
          <Card className="border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height={Math.max(circumferenceData.length * 38 + 40, 240)}>
                <BarChart data={circumferenceData} layout="vertical" margin={{ top: 0, right: 40, left: 72, bottom: 12 }} barSize={10} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 shadow-lg">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Inicial: {formatDate(comparisonStart?.createdAt)} • Final: {formatDate(comparisonEnd?.createdAt)}
                          </p>
                          {payload.map((p: any) => (
                            <p key={p.name} className="text-xs font-semibold" style={{ color: p.fill }}>
                              {p.name === "atual" ? "Final" : "Inicial"}: {formatNumber(p.value)} cm
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                  {comparisonStart && <Bar dataKey="inicial" name="Inicial" fill="#C4B5FD" radius={[0, 4, 4, 0]} />}
                  <Bar dataKey="atual" name="Final" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {foldData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
          <SectionHeader
            icon={<Activity className="h-3.5 w-3.5 text-rose-500" />}
            title="Dobras Cutâneas (mm)"
            subtitle="Comparação por dobra entre a avaliação inicial e final selecionadas."
          />
          <Card className="border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height={Math.max(foldData.length * 38 + 40, 220)}>
                <BarChart data={foldData} layout="vertical" margin={{ top: 0, right: 40, left: 72, bottom: 12 }} barSize={10} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 shadow-lg">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Inicial: {formatDate(comparisonStart?.createdAt)} • Final: {formatDate(comparisonEnd?.createdAt)}
                          </p>
                          {payload.map((p: any) => (
                            <p key={p.name} className="text-xs font-semibold" style={{ color: p.fill }}>
                              {p.name === "atual" ? "Final" : "Inicial"}: {formatNumber(p.value)} mm
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                  {comparisonStart && <Bar dataKey="inicial" name="Inicial" fill="#FECDD3" radius={[0, 4, 4, 0]} />}
                  <Bar dataKey="atual" name="Final" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        <SectionHeader
          icon={<Calendar className="h-3.5 w-3.5 text-emerald-500" />}
          title="Histórico de Avaliações"
          subtitle="A linha do tempo destaca avaliação mais recente e o intervalo de comparação selecionado."
        />
        <div className="relative pl-5">
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-purple-300 via-purple-200 to-transparent rounded-full" />
          <div className="space-y-3">
            {[...sortedHistory].reverse().map((assessment, idx) => {
              const isMostRecent = idx === 0;
              const isSelectedStart = comparisonStart?.id === assessment.id;
              const isSelectedEnd = comparisonEnd?.id === assessment.id;

              const emphasisClass = isSelectedStart
                ? "border-blue-300 bg-blue-50/40"
                : isSelectedEnd
                ? "border-emerald-300 bg-emerald-50/40"
                : isMostRecent
                ? "border-purple-200 bg-purple-50/50"
                : "border-gray-100";

              return (
                <motion.div
                  key={assessment.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="relative"
                >
                  <div
                    className={`absolute -left-3.5 top-3.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                      isSelectedStart ? "bg-blue-500" : isSelectedEnd ? "bg-emerald-500" : isMostRecent ? "bg-purple-600" : "bg-purple-200"
                    }`}
                  />
                  <Card className={`border shadow-sm ml-1 ${emphasisClass}`}>
                    <CardContent className="px-3.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{assessment.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDateLong(assessment.createdAt)}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {isMostRecent && (
                            <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 border-0 shrink-0">
                              Mais recente
                            </Badge>
                          )}
                          {isSelectedStart && (
                            <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 bg-blue-50">
                              Inicial
                            </Badge>
                          )}
                          {isSelectedEnd && (
                            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50">
                              Final
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {assessment.weightKg != null && (
                          <span className="text-[11px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                            {formatNumber(assessment.weightKg)} kg
                          </span>
                        )}
                        {assessment.manualBodyFatPercent != null && !Number.isNaN(assessment.manualBodyFatPercent) && (
                          <span className="text-[11px] bg-orange-50 text-orange-700 rounded-full px-2 py-0.5 font-medium">
                            {formatNumber(assessment.manualBodyFatPercent)}% gordura
                          </span>
                        )}
                        {assessment.circumWaist != null && (
                          <span className="text-[11px] bg-purple-50 text-purple-700 rounded-full px-2 py-0.5 font-medium">
                            Cintura: {formatNumber(assessment.circumWaist)} cm
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
