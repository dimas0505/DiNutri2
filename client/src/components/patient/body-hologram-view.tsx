import { useEffect, useRef } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import type { AnthropometricAssessment } from "@shared/schema";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MeasurePoint {
  id: string;
  label: string;
  value: number;
  unit: string;
  /** Posição no SVG (0-100 %) */
  cx: number;
  cy: number;
  /** Direção da linha: "left" | "right" */
  side: "left" | "right";
}

interface BodyHologramViewProps {
  assessment: AnthropometricAssessment;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPoints(a: AnthropometricAssessment): MeasurePoint[] {
  type Candidate = { label: string; raw: number | null | undefined; unit: string; cx: number; cy: number; side: "left" | "right" };
  const candidates: Candidate[] = [
    { label: "Pescoço",       raw: a.circumNeck,                       unit: "cm", cx: 50, cy: 13.5, side: "right" },
    { label: "Tórax",         raw: a.circumChest,                      unit: "cm", cx: 50, cy: 22,   side: "left"  },
    { label: "Cintura",       raw: a.circumWaist,                      unit: "cm", cx: 50, cy: 33,   side: "right" },
    { label: "Abdômen",       raw: a.circumAbdomen,                    unit: "cm", cx: 50, cy: 38,   side: "left"  },
    { label: "Quadril",       raw: a.circumHip,                        unit: "cm", cx: 50, cy: 46,   side: "right" },
    { label: "Braço relax.",  raw: a.circumNonDominantArmRelaxed,      unit: "cm", cx: 50, cy: 27,   side: "left"  },
    { label: "Braço contr.",  raw: a.circumNonDominantArmContracted,   unit: "cm", cx: 50, cy: 31,   side: "right" },
    { label: "Coxa",          raw: a.circumNonDominantProximalThigh,   unit: "cm", cx: 50, cy: 56,   side: "left"  },
    { label: "Panturrilha",   raw: a.circumNonDominantCalf,            unit: "cm", cx: 50, cy: 68,   side: "right" },
  ];

  return candidates
    .filter((c) => c.raw != null)
    .map((c, i) => ({
      id: `mp-${i}`,
      label: c.label,
      value: c.raw as number,
      unit: c.unit,
      cx: c.cx,
      cy: c.cy,
      side: c.side,
    }));
}

// ─── Constantes visuais ───────────────────────────────────────────────────────

const NEON_BLUE   = "#00D4FF";
const NEON_CYAN   = "#00FFE0";
const NEON_PURPLE = "#A855F7";
const GLOW_BLUE   = "rgba(0,212,255,0.35)";

// Pontos de ancoragem no corpo (cx, cy em % do viewBox 100×100)
// Mapeados para cada medida
const ANCHOR_MAP: Record<string, { ax: number; ay: number }> = {
  "Pescoço":      { ax: 50,   ay: 13.5 },
  "Tórax":        { ax: 42,   ay: 22   },
  "Cintura":      { ax: 56,   ay: 33   },
  "Abdômen":      { ax: 42,   ay: 38   },
  "Quadril":      { ax: 56,   ay: 46   },
  "Braço relax.": { ax: 38,   ay: 27   },
  "Braço contr.": { ax: 62,   ay: 31   },
  "Coxa":         { ax: 42,   ay: 56   },
  "Panturrilha":  { ax: 57,   ay: 68   },
};

// ─── Sub-componente: linha + label animados ────────────────────────────────────

interface MeasureLineProps {
  point: MeasurePoint;
  index: number;
  total: number;
}

function MeasureLine({ point, index, total }: MeasureLineProps) {
  const anchor = ANCHOR_MAP[point.label] ?? { ax: point.cx, ay: point.cy };
  const isLeft = point.side === "left";

  // Posição do label (fora do corpo)
  const labelX = isLeft ? 8 : 92;
  const labelY = anchor.ay;

  // Ponto intermediário para a linha em L
  const midX = isLeft ? 28 : 72;

  const delay = 0.4 + index * 0.15;

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
    >
      {/* Linha do corpo até o label */}
      <motion.polyline
        points={`${anchor.ax},${anchor.ay} ${midX},${anchor.ay} ${labelX + (isLeft ? 14 : -14)},${labelY}`}
        fill="none"
        stroke={NEON_CYAN}
        strokeWidth="0.4"
        strokeDasharray="2 1"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.85 }}
        transition={{ delay, duration: 0.6, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 2px ${NEON_CYAN})` }}
      />

      {/* Ponto de ancoragem no corpo */}
      <motion.circle
        cx={anchor.ax}
        cy={anchor.ay}
        r="0.8"
        fill={NEON_CYAN}
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.6, 1] }}
        transition={{ delay, duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
        style={{ filter: `drop-shadow(0 0 3px ${NEON_CYAN})` }}
      />

      {/* Caixa do label */}
      <motion.rect
        x={isLeft ? labelX - 1 : labelX - 13}
        y={labelY - 3.5}
        width="14"
        height="7"
        rx="1"
        fill="rgba(0,20,40,0.85)"
        stroke={NEON_BLUE}
        strokeWidth="0.3"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: delay + 0.3, duration: 0.3 }}
        style={{ transformOrigin: `${isLeft ? labelX + 6 : labelX - 6}px ${labelY}px`, filter: `drop-shadow(0 0 2px ${GLOW_BLUE})` }}
      />

      {/* Valor */}
      <motion.text
        x={isLeft ? labelX + 6 : labelX - 6}
        y={labelY - 0.5}
        textAnchor="middle"
        fontSize="2.2"
        fontWeight="700"
        fill={NEON_BLUE}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5, duration: 0.4 }}
        style={{ fontFamily: "monospace", filter: `drop-shadow(0 0 2px ${NEON_BLUE})` }}
      >
        {point.value}
      </motion.text>

      {/* Unidade + label */}
      <motion.text
        x={isLeft ? labelX + 6 : labelX - 6}
        y={labelY + 2.2}
        textAnchor="middle"
        fontSize="1.5"
        fill={NEON_CYAN}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ delay: delay + 0.6, duration: 0.4 }}
        style={{ fontFamily: "monospace" }}
      >
        {point.unit} · {point.label}
      </motion.text>
    </motion.g>
  );
}

// ─── Silhueta SVG do corpo humano ─────────────────────────────────────────────

function BodySilhouette() {
  return (
    <g>
      {/* Cabeça */}
      <ellipse cx="50" cy="7" rx="4.5" ry="5.5"
        fill="none" stroke={NEON_BLUE} strokeWidth="0.6"
        style={{ filter: `drop-shadow(0 0 3px ${NEON_BLUE})` }} />

      {/* Pescoço */}
      <rect x="47.5" y="12.2" width="5" height="3"
        fill="none" stroke={NEON_BLUE} strokeWidth="0.5"
        style={{ filter: `drop-shadow(0 0 2px ${NEON_BLUE})` }} />

      {/* Tronco */}
      <path d="M38,15 Q36,18 36,22 L36,44 Q36,47 38,48 L62,48 Q64,47 64,44 L64,22 Q64,18 62,15 Z"
        fill="rgba(0,100,180,0.07)" stroke={NEON_BLUE} strokeWidth="0.6"
        style={{ filter: `drop-shadow(0 0 3px ${NEON_BLUE})` }} />

      {/* Braço esquerdo */}
      <path d="M36,16 Q30,18 28,24 Q26,30 27,36 Q28,38 30,38 Q32,38 33,36 Q34,30 35,24 Q36,20 38,18"
        fill="none" stroke={NEON_BLUE} strokeWidth="0.6"
        style={{ filter: `drop-shadow(0 0 2px ${NEON_BLUE})` }} />

      {/* Braço direito */}
      <path d="M64,16 Q70,18 72,24 Q74,30 73,36 Q72,38 70,38 Q68,38 67,36 Q66,30 65,24 Q64,20 62,18"
        fill="none" stroke={NEON_BLUE} strokeWidth="0.6"
        style={{ filter: `drop-shadow(0 0 2px ${NEON_BLUE})` }} />

      {/* Perna esquerda */}
      <path d="M44,48 Q42,52 41,58 Q40,64 40,72 Q40,78 41,82 Q42,84 44,84 Q46,84 47,82 Q48,78 48,72 L48,48"
        fill="none" stroke={NEON_BLUE} strokeWidth="0.6"
        style={{ filter: `drop-shadow(0 0 2px ${NEON_BLUE})` }} />

      {/* Perna direita */}
      <path d="M56,48 Q58,52 59,58 Q60,64 60,72 Q60,78 59,82 Q58,84 56,84 Q54,84 53,82 Q52,78 52,72 L52,48"
        fill="none" stroke={NEON_BLUE} strokeWidth="0.6"
        style={{ filter: `drop-shadow(0 0 2px ${NEON_BLUE})` }} />

      {/* Pé esquerdo */}
      <ellipse cx="42" cy="85" rx="3.5" ry="1.5"
        fill="none" stroke={NEON_BLUE} strokeWidth="0.5" />

      {/* Pé direito */}
      <ellipse cx="58" cy="85" rx="3.5" ry="1.5"
        fill="none" stroke={NEON_BLUE} strokeWidth="0.5" />

      {/* Linhas internas de detalhe holográfico */}
      <line x1="40" y1="22" x2="60" y2="22" stroke={NEON_CYAN} strokeWidth="0.2" strokeDasharray="1 2" opacity="0.4" />
      <line x1="39" y1="33" x2="61" y2="33" stroke={NEON_CYAN} strokeWidth="0.2" strokeDasharray="1 2" opacity="0.4" />
      <line x1="38" y1="44" x2="62" y2="44" stroke={NEON_CYAN} strokeWidth="0.2" strokeDasharray="1 2" opacity="0.4" />
    </g>
  );
}

// ─── Efeito de scan horizontal ────────────────────────────────────────────────

function ScanLine() {
  return (
    <motion.rect
      x="30"
      y="0"
      width="40"
      height="0.8"
      fill={`url(#scanGrad)`}
      initial={{ y: 5 }}
      animate={{ y: [5, 88, 5] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      opacity={0.6}
    />
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function BodyHologramView({ assessment }: BodyHologramViewProps) {
  const points = buildPoints(assessment);

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* Fundo escuro com gradiente */}
      <div
        className="w-full rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(160deg, #020c18 0%, #041428 60%, #060820 100%)",
          boxShadow: `0 0 40px rgba(0,180,255,0.15), inset 0 0 60px rgba(0,100,200,0.05)`,
          minHeight: 480,
        }}
      >
        {/* Grade de fundo */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={NEON_BLUE} strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Círculos de brilho decorativos */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 200,
            height: 200,
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(circle, rgba(0,180,255,0.08) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* SVG principal */}
        <svg
          viewBox="0 0 100 95"
          className="relative z-10 w-full"
          style={{ maxHeight: 520 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradiente do scan */}
            <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={NEON_CYAN} stopOpacity="0" />
              <stop offset="50%"  stopColor={NEON_CYAN} stopOpacity="0.8" />
              <stop offset="100%" stopColor={NEON_CYAN} stopOpacity="0" />
            </linearGradient>

            {/* Filtro de brilho */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Scan animado */}
          <ScanLine />

          {/* Silhueta */}
          <motion.g
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ transformOrigin: "50% 50%" }}
          >
            <BodySilhouette />
          </motion.g>

          {/* Linhas de medida */}
          {points.map((p, i) => (
            <MeasureLine key={p.id} point={p} index={i} total={points.length} />
          ))}
        </svg>

        {/* Rodapé com peso e gordura */}
        <div className="relative z-10 px-4 pb-4 flex flex-wrap gap-2 justify-center">
          {assessment.weightKg != null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.5 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(0,20,40,0.85)",
                border: `1px solid ${NEON_BLUE}`,
                boxShadow: `0 0 8px ${GLOW_BLUE}`,
              }}
            >
              <span style={{ color: NEON_CYAN, fontSize: 11, fontFamily: "monospace" }}>PESO</span>
              <span style={{ color: NEON_BLUE, fontSize: 15, fontWeight: 700, fontFamily: "monospace" }}>
                {assessment.weightKg} kg
              </span>
            </motion.div>
          )}

          {assessment.manualBodyFatPercent != null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.0, duration: 0.5 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(20,0,40,0.85)",
                border: `1px solid ${NEON_PURPLE}`,
                boxShadow: `0 0 8px rgba(168,85,247,0.3)`,
              }}
            >
              <span style={{ color: "#C084FC", fontSize: 11, fontFamily: "monospace" }}>GORDURA</span>
              <span style={{ color: NEON_PURPLE, fontSize: 15, fontWeight: 700, fontFamily: "monospace" }}>
                {assessment.manualBodyFatPercent}%
              </span>
              {assessment.manualBodyFatClassification && (
                <span style={{ color: "#C084FC", fontSize: 10, fontFamily: "monospace" }}>
                  · {assessment.manualBodyFatClassification}
                </span>
              )}
            </motion.div>
          )}
        </div>

        {/* Canto decorativo — título */}
        <motion.div
          className="absolute top-3 left-4 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p style={{ color: NEON_CYAN, fontSize: 9, fontFamily: "monospace", letterSpacing: 2, opacity: 0.7 }}>
            ANÁLISE CORPORAL · DiNutri
          </p>
        </motion.div>

        <motion.div
          className="absolute top-3 right-4 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: NEON_CYAN,
              boxShadow: `0 0 6px ${NEON_CYAN}`,
            }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </motion.div>
      </div>

      {/* Legenda */}
      {points.length === 0 && (
        <p className="text-center text-xs mt-4" style={{ color: NEON_CYAN, fontFamily: "monospace", opacity: 0.6 }}>
          Nenhuma circunferência registrada nesta avaliação.
        </p>
      )}
    </div>
  );
}
