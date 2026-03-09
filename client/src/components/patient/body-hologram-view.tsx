/**
 * BodyHologramView
 *
 * Exibe a imagem holográfica do corpo humano como arte-base fixa
 * e sobrepõe dinamicamente pontos, linhas e labels apenas para as
 * medidas antropométricas realmente presentes na avaliação.
 *
 * Princípio: a imagem é soberana. O código apenas adiciona overlays.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Percent, Weight } from "lucide-react";
import type { AnthropometricAssessment } from "@shared/schema";
import { getActivePoints } from "./measurement-points";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BodyHologramViewProps {
  data: AnthropometricAssessment;
}

// ─── Constantes visuais ───────────────────────────────────────────────────────

/** Cor neon ciano — consistente com a imagem base */
const NEON = "#22d3ee";
const NEON_DIM = "rgba(34,211,238,0.7)";

// ─── Componente principal ─────────────────────────────────────────────────────

export function BodyHologramView({ data }: BodyHologramViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const activePoints = getActivePoints(data);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: "#020d1a",
        border: "1px solid rgba(34,211,238,0.2)",
        boxShadow: "0 0 24px rgba(6,182,212,0.12)",
        // Proporção da imagem: ~750×1000px → 3:4
        aspectRatio: "3 / 4",
      }}
      aria-label="Visualização holográfica das medidas corporais"
    >
      {/* ── Grade tecnológica de fundo ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(14,165,233,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* ── Imagem base holográfica ── */}
      <img
        src="/body-hologram.png"
        alt="Corpo holográfico — base visual"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ zIndex: 1 }}
        draggable={false}
      />

      {/* ── Overlay SVG: linhas e pontos de ancoragem ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ zIndex: 2 }}
        aria-hidden="true"
      >
        {activePoints.map((point, i) => {
          // Extremidade da linha (label side)
          const lineEndX = point.side === "right" ? point.anchor.x + 18 : point.anchor.x - 18;
          const lineEndY = point.anchor.y;

          return (
            <g key={point.id}>
              {/* Linha tracejada do ponto ao label */}
              <motion.line
                x1={point.anchor.x}
                y1={point.anchor.y}
                x2={lineEndX}
                y2={lineEndY}
                stroke={NEON}
                strokeWidth="0.35"
                strokeDasharray="1.5 1"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.75 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.3 + i * 0.12,
                  duration: shouldReduceMotion ? 0 : 0.5,
                  ease: "easeOut",
                }}
              />

              {/* Ponto de ancoragem pulsante */}
              <motion.circle
                cx={point.anchor.x}
                cy={point.anchor.y}
                r="0.9"
                fill={NEON}
                initial={{ opacity: 0, scale: 0 }}
                animate={
                  shouldReduceMotion
                    ? { opacity: 1, scale: 1 }
                    : {
                        opacity: [0, 1, 0.7, 1],
                        scale: [0, 1.4, 1, 1.2],
                      }
                }
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.3 + i * 0.12,
                  duration: shouldReduceMotion ? 0.1 : 0.6,
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  repeatDelay: 2.5,
                  repeatType: "loop",
                }}
                style={{ filter: `drop-shadow(0 0 2px ${NEON})` }}
              />
            </g>
          );
        })}
      </svg>

      {/* ── Labels HTML flutuantes ── */}
      {activePoints.map((point, i) => {
        const isRight = point.side === "right";

        return (
          <motion.div
            key={point.id}
            role="note"
            aria-label={`${point.label}: ${point.value} ${point.unit}`}
            initial={{ opacity: 0, x: isRight ? 12 : -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: shouldReduceMotion ? 0 : 0.5 + i * 0.12,
              duration: shouldReduceMotion ? 0 : 0.35,
              ease: "easeOut",
            }}
            className="absolute"
            style={{
              zIndex: 3,
              top: `${point.anchor.y}%`,
              // Posiciona o label fora do corpo, no lado correto
              [isRight ? "left" : "right"]: isRight
                ? `${point.anchor.x + 20}%`
                : `${100 - point.anchor.x + 20}%`,
              transform: "translateY(-50%)",
              // Garante que não saia da área visível
              maxWidth: "28%",
            }}
          >
            <div
              className="px-2.5 py-1.5 rounded-full text-left"
              style={{
                background: "linear-gradient(135deg, rgba(224,242,254,0.92) 0%, rgba(186,230,253,0.88) 100%)",
                border: `1px solid ${NEON_DIM}`,
                boxShadow: `0 0 10px rgba(34,211,238,0.18), inset 0 1px 0 rgba(255,255,255,0.6)`,
                backdropFilter: "blur(4px)",
                whiteSpace: "nowrap",
              }}
            >
              <div
                className="font-bold leading-none"
                style={{
                  fontSize: "clamp(9px, 1.8vw, 12px)",
                  color: "#0c4a6e",
                  letterSpacing: "0.01em",
                }}
              >
                {point.value} {point.unit}
              </div>
              <div
                className="leading-none mt-0.5 opacity-70 uppercase"
                style={{
                  fontSize: "clamp(7px, 1.3vw, 9px)",
                  color: "#075985",
                  letterSpacing: "0.06em",
                }}
              >
                {point.label}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* ── Rodapé: peso e % gordura ── */}
      {(data.weightKg != null || data.manualBodyFatPercent != null) && (
        <motion.div
          className="absolute bottom-3 left-3 right-3 flex gap-2"
          style={{ zIndex: 4 }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: shouldReduceMotion ? 0 : 1.4,
            duration: shouldReduceMotion ? 0 : 0.4,
          }}
        >
          {data.weightKg != null && (
            <SummaryPill
              icon={<Weight className="w-3 h-3" />}
              label="Peso"
              value={`${data.weightKg} kg`}
              color="cyan"
            />
          )}
          {data.manualBodyFatPercent != null && (
            <SummaryPill
              icon={<Percent className="w-3 h-3" />}
              label="Gordura"
              value={`${data.manualBodyFatPercent}%`}
              color="orange"
              subtitle={data.manualBodyFatClassification ?? undefined}
            />
          )}
        </motion.div>
      )}

      {/* ── Badge de título ── */}
      <div
        className="absolute top-3 left-3"
        style={{ zIndex: 4 }}
      >
        <span
          className="font-mono uppercase tracking-widest"
          style={{
            fontSize: "clamp(7px, 1.5vw, 9px)",
            color: NEON_DIM,
            letterSpacing: "0.2em",
          }}
        >
          Análise Corporal
        </span>
      </div>

      {/* ── Indicador de status ── */}
      <motion.div
        className="absolute top-3 right-3 rounded-full"
        style={{
          zIndex: 4,
          width: 7,
          height: 7,
          background: NEON,
          boxShadow: `0 0 6px ${NEON}`,
        }}
        animate={shouldReduceMotion ? {} : { opacity: [1, 0.25, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
    </div>
  );
}

// ─── Sub-componente: pílula de resumo ─────────────────────────────────────────

interface SummaryPillProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "cyan" | "orange";
  subtitle?: string;
}

function SummaryPill({ icon, label, value, color, subtitle }: SummaryPillProps) {
  const styles = {
    cyan: {
      bg: "linear-gradient(135deg, rgba(224,242,254,0.92) 0%, rgba(186,230,253,0.88) 100%)",
      border: "rgba(34,211,238,0.5)",
      labelColor: "#075985",
      valueColor: "#0c4a6e",
    },
    orange: {
      bg: "linear-gradient(135deg, rgba(255,237,213,0.92) 0%, rgba(254,215,170,0.88) 100%)",
      border: "rgba(251,146,60,0.5)",
      labelColor: "#9a3412",
      valueColor: "#7c2d12",
    },
  }[color];

  return (
    <div
      className="flex-1 rounded-xl px-2.5 py-2"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="flex items-center gap-1 mb-0.5"
        style={{ color: styles.labelColor, opacity: 0.8 }}
      >
        {icon}
        <span
          className="uppercase font-bold tracking-wider"
          style={{ fontSize: "clamp(7px, 1.3vw, 9px)" }}
        >
          {label}
        </span>
      </div>
      <div
        className="font-black leading-none"
        style={{
          fontSize: "clamp(11px, 2.2vw, 14px)",
          color: styles.valueColor,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          className="mt-0.5 opacity-60"
          style={{
            fontSize: "clamp(7px, 1.2vw, 8px)",
            color: styles.labelColor,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
