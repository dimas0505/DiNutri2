import { motion } from "framer-motion";
import { Percent, Weight } from "lucide-react";
import type { AnthropometricAssessment } from "@shared/schema";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  data: AnthropometricAssessment;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function BodyHologramView({ data }: Props) {
  // Mapeamento de coordenadas (x, y em % do container) para os pontos de medida
  // O SVG usa viewBox="0 0 100 200", então y% mapeia diretamente para a altura
  const anchors = [
    { label: "Pescoço",     value: data.circumNeck,                     unit: "cm", x: 50, y: 15,  side: "right" },
    { label: "Tórax",       value: data.circumChest,                    unit: "cm", x: 50, y: 28,  side: "left"  },
    { label: "Cintura",     value: data.circumWaist,                    unit: "cm", x: 50, y: 38,  side: "right" },
    { label: "Abdômen",     value: data.circumAbdomen,                  unit: "cm", x: 50, y: 43,  side: "left"  },
    { label: "Quadril",     value: data.circumHip,                      unit: "cm", x: 50, y: 52,  side: "right" },
    { label: "Braço",       value: data.circumNonDominantArmRelaxed,    unit: "cm", x: 28, y: 30,  side: "left"  },
    { label: "Coxa",        value: data.circumNonDominantProximalThigh, unit: "cm", x: 42, y: 65,  side: "left"  },
    { label: "Panturrilha", value: data.circumNonDominantCalf,          unit: "cm", x: 40, y: 80,  side: "left"  },
  ].filter((a) => a.value != null && a.value !== undefined);

  return (
    <div className="relative w-full aspect-[3/4] bg-slate-950 rounded-3xl overflow-hidden border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">

      {/* ── Grade Tecnológica de Fundo ── */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* ── Brilho central radial ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 50% 45%, rgba(6,182,212,0.07) 0%, transparent 70%)",
        }}
      />

      {/* ── Scan Line Animation ── */}
      <motion.div
        className="absolute w-full h-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee,0_0_30px_#22d3ee] z-10"
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />

      {/* ── Título / badge ── */}
      <motion.div
        className="absolute top-3 left-4 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-[9px] font-mono tracking-[3px] text-cyan-400/70 uppercase">
          Análise Corporal · DiNutri
        </span>
      </motion.div>

      {/* ── Indicador de status (ponto piscando) ── */}
      <motion.div
        className="absolute top-4 right-4 z-20 w-2 h-2 rounded-full bg-cyan-400"
        style={{ boxShadow: "0 0 6px #22d3ee" }}
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />

      {/* ── Área principal: SVG + Labels ── */}
      <div className="relative h-full w-full flex items-center justify-center px-2 pt-8 pb-20">

        {/* Silhueta SVG Humana Anatômica */}
        <svg
          viewBox="0 0 100 200"
          className="h-full drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]"
          style={{ maxWidth: "45%" }}
        >
          {/* ── Definições (filtros e gradientes) ── */}
          <defs>
            <filter id="neonGlow">
              <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* ── Silhueta humana frontal (path anatômico) ── */}
          <g filter="url(#neonGlow)" fill="none" stroke="url(#bodyGrad)" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">

            {/* Cabeça */}
            <ellipse cx="50" cy="12" rx="8" ry="10" />

            {/* Pescoço */}
            <path d="M45,21 L45,26 Q50,28 55,26 L55,21" />

            {/* Ombros e tronco superior */}
            <path d="M45,26 Q38,27 33,30 L30,45 Q29,50 31,52 L35,52 Q37,50 37,46 L37,38" />
            <path d="M55,26 Q62,27 67,30 L70,45 Q71,50 69,52 L65,52 Q63,50 63,46 L63,38" />

            {/* Tronco central */}
            <path d="M37,38 Q38,55 40,62 L42,75 Q44,80 50,80 Q56,80 58,75 L60,62 Q62,55 63,38" />

            {/* Linha da cintura */}
            <path d="M38,52 Q50,55 62,52" strokeWidth="0.6" strokeDasharray="2 1" opacity="0.5" />

            {/* Linha do quadril */}
            <path d="M40,62 Q50,65 60,62" strokeWidth="0.6" strokeDasharray="2 1" opacity="0.5" />

            {/* Braço esquerdo */}
            <path d="M33,30 Q28,35 26,45 Q25,52 27,58 Q28,62 31,62 Q34,62 35,58 Q36,52 36,46" />

            {/* Braço direito */}
            <path d="M67,30 Q72,35 74,45 Q75,52 73,58 Q72,62 69,62 Q66,62 65,58 Q64,52 64,46" />

            {/* Mão esquerda */}
            <ellipse cx="29" cy="64" rx="3" ry="4" />

            {/* Mão direita */}
            <ellipse cx="71" cy="64" rx="3" ry="4" />

            {/* Perna esquerda */}
            <path d="M42,75 Q40,88 39,100 Q38,112 39,124 Q40,130 43,132 Q46,133 48,130 Q50,126 49,114 L48,100 L47,80" />

            {/* Perna direita */}
            <path d="M58,75 Q60,88 61,100 Q62,112 61,124 Q60,130 57,132 Q54,133 52,130 Q50,126 51,114 L52,100 L53,80" />

            {/* Pé esquerdo */}
            <path d="M39,124 Q36,130 35,135 Q34,138 37,139 Q44,140 48,138 Q50,136 49,132" />

            {/* Pé direito */}
            <path d="M61,124 Q64,130 65,135 Q66,138 63,139 Q56,140 52,138 Q50,136 51,132" />

            {/* Linha central do tronco (detalhe holográfico) */}
            <line x1="50" y1="26" x2="50" y2="75" strokeWidth="0.4" strokeDasharray="3 2" opacity="0.4" />

            {/* Clavículas */}
            <path d="M45,26 Q47,25 50,25 Q53,25 55,26" strokeWidth="0.6" opacity="0.6" />
          </g>

          {/* ── Pontos de ancoragem e linhas de medida ── */}
          {anchors.map((point, i) => {
            const lineEndX = point.side === "right" ? point.x + 22 : point.x - 22;
            return (
              <g key={i}>
                {/* Ponto pulsante */}
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  fill="#22d3ee"
                  initial={{ r: 0, opacity: 0 }}
                  animate={{ r: [1.2, 2.2, 1.2], opacity: 1 }}
                  transition={{
                    delay: 0.5 + i * 0.18,
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                  style={{ filter: "drop-shadow(0 0 3px #22d3ee)" }}
                />

                {/* Linha de medida tracejada */}
                <motion.line
                  x1={point.x}
                  y1={point.y}
                  x2={lineEndX}
                  y2={point.y}
                  stroke="#22d3ee"
                  strokeWidth="0.5"
                  strokeDasharray="2 1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.8 }}
                  transition={{ delay: 0.5 + i * 0.18, duration: 0.5 }}
                  style={{ filter: "drop-shadow(0 0 2px #22d3ee)" }}
                />
              </g>
            );
          })}
        </svg>

        {/* ── Labels HTML Flutuantes ── */}
        {anchors.map((point, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: point.side === "right" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.18, duration: 0.4 }}
            className="absolute text-[10px] font-mono p-1.5 bg-slate-900/90 border border-cyan-500/50 rounded-lg backdrop-blur-sm shadow-[0_0_10px_rgba(34,211,238,0.2)]"
            style={{
              top: `${point.y}%`,
              [point.side === "right" ? "left" : "right"]: "4%",
              transform: "translateY(-50%)",
              minWidth: 64,
            }}
          >
            <div className="text-cyan-400/70 uppercase text-[8px] tracking-wider leading-none mb-0.5">
              {point.label}
            </div>
            <div className="font-bold text-xs text-cyan-300 leading-none">
              {point.value} {point.unit}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Rodapé com Resumo (Peso e %BF) ── */}
      <div className="absolute bottom-3 left-3 right-3 flex gap-2 z-20">
        {data.weightKg != null && (
          <SummaryCard
            icon={<Weight className="w-3 h-3" />}
            label="Peso"
            value={`${data.weightKg} kg`}
            color="cyan"
            delay={1.8}
          />
        )}
        {data.manualBodyFatPercent != null && (
          <SummaryCard
            icon={<Percent className="w-3 h-3" />}
            label="Gordura"
            value={`${data.manualBodyFatPercent}%`}
            color="orange"
            delay={2.0}
            subtitle={data.manualBodyFatClassification ?? undefined}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-componente: cartão de resumo ─────────────────────────────────────────

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "cyan" | "orange";
  delay?: number;
  subtitle?: string;
}

function SummaryCard({ icon, label, value, color, delay = 0, subtitle }: SummaryCardProps) {
  const colorMap = {
    cyan:   { border: "border-cyan-500/50",   text: "text-cyan-400",   value: "text-cyan-300"   },
    orange: { border: "border-orange-500/50", text: "text-orange-400", value: "text-orange-300" },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`flex-1 bg-slate-900/90 border rounded-xl p-2 backdrop-blur-md ${c.border}`}
    >
      <div className={`flex items-center gap-1.5 opacity-70 mb-0.5 ${c.text}`}>
        {icon}
        <span className="text-[8px] uppercase font-bold tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-black ${c.value}`}>{value}</div>
      {subtitle && (
        <div className={`text-[8px] opacity-60 mt-0.5 ${c.text}`}>{subtitle}</div>
      )}
    </motion.div>
  );
}
