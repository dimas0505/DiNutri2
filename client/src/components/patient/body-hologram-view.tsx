/**
 * BodyHologramView
 *
 * Exibe a imagem holográfica do corpo humano como arte-base fixa
 * e sobrepõe dinamicamente pontos, linhas e labels apenas para as
 * medidas antropométricas realmente presentes na avaliação.
 *
 * Princípio: a imagem é soberana. O código apenas adiciona overlays.
 *
 * Imagem base: body-hologram.png (1024×1536px, proporção 2:3)
 * Coordenadas calibradas pixel a pixel pelo usuário.
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

const NEON = "#22d3ee";
const NEON_DIM = "rgba(34,211,238,0.65)";

// ─── Componente principal ─────────────────────────────────────────────────────

export function BodyHologramView({ data }: BodyHologramViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const activePoints = getActivePoints(data);

  return (
    <motion.div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: "#020d1a",
        border: "1px solid rgba(34,211,238,0.18)",
        boxShadow: "0 0 28px rgba(6,182,212,0.10)",
        // Proporção da imagem: 1024×1536 → 2:3
        aspectRatio: "2 / 3",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      aria-label="Visualização holográfica das medidas corporais"
    >
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
          // A linha vai do ponto de ancoragem até a borda da área do label
          const offset = 14; // distância horizontal da linha
          const lineEndX = point.side === "right"
            ? point.anchor.x + offset
            : point.anchor.x - offset;

          return (
            <g key={point.id}>
              {/* Linha tracejada do ponto ao label */}
              <motion.line
                x1={point.anchor.x}
                y1={point.anchor.y}
                x2={lineEndX}
                y2={point.anchor.y}
                stroke={NEON}
                strokeWidth="0.3"
                strokeDasharray="1.2 0.8"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.7 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.4 + i * 0.1,
                  duration: shouldReduceMotion ? 0 : 0.45,
                  ease: "easeOut",
                }}
              />

              {/* Ponto de ancoragem pulsante */}
              <motion.circle
                cx={point.anchor.x}
                cy={point.anchor.y}
                r="0.8"
                fill={NEON}
                initial={{ opacity: 0, scale: 0 }}
                animate={
                  shouldReduceMotion
                    ? { opacity: 1, scale: 1 }
                    : {
                        opacity: [0, 1, 0.6, 1],
                        scale: [0, 1.5, 1, 1.3],
                      }
                }
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.4 + i * 0.1,
                  duration: shouldReduceMotion ? 0.1 : 0.55,
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  repeatDelay: 3,
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
            initial={{ opacity: 0, x: isRight ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: shouldReduceMotion ? 0 : 0.55 + i * 0.1,
              duration: shouldReduceMotion ? 0 : 0.3,
              ease: "easeOut",
            }}
            className="absolute"
            style={{
              zIndex: 3,
              top: `${point.anchor.y}%`,
              // Posiciona o label fora do corpo, no lado correto
              // O offset de 14% no SVG + margem para o label não sobrepor a linha
              ...(isRight
                ? { left: `${point.anchor.x + 15}%` }
                : { right: `${100 - point.anchor.x + 15}%` }),
              transform: "translateY(-50%)",
              maxWidth: "26%",
              minWidth: 52,
            }}
          >
            <div
              className="px-2 py-1.5 rounded-full"
              style={{
                background: "linear-gradient(135deg, rgba(224,242,254,0.94) 0%, rgba(186,230,253,0.90) 100%)",
                border: `1px solid ${NEON_DIM}`,
                boxShadow: `0 0 8px rgba(34,211,238,0.15), inset 0 1px 0 rgba(255,255,255,0.65)`,
                backdropFilter: "blur(3px)",
                whiteSpace: "nowrap",
              }}
            >
              <div
                className="font-black leading-none"
                style={{
                  fontSize: "clamp(8px, 1.7vw, 11px)",
                  color: "#0c4a6e",
                }}
              >
                {point.value} {point.unit}
              </div>
              <div
                className="leading-none mt-0.5 opacity-75 uppercase tracking-wide"
                style={{
                  fontSize: "clamp(6px, 1.1vw, 8px)",
                  color: "#075985",
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
            delay: shouldReduceMotion ? 0 : 1.5,
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
          className="font-mono uppercase"
          style={{
            fontSize: "clamp(7px, 1.4vw, 9px)",
            color: NEON_DIM,
            letterSpacing: "0.18em",
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
        animate={shouldReduceMotion ? {} : { opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </motion.div>
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
      bg: "linear-gradient(135deg, rgba(224,242,254,0.94) 0%, rgba(186,230,253,0.90) 100%)",
      border: "rgba(34,211,238,0.45)",
      labelColor: "#075985",
      valueColor: "#0c4a6e",
    },
    orange: {
      bg: "linear-gradient(135deg, rgba(255,237,213,0.94) 0%, rgba(254,215,170,0.90) 100%)",
      border: "rgba(251,146,60,0.45)",
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
        boxShadow: "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.55)",
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
          style={{ fontSize: "clamp(7px, 1.2vw, 9px)" }}
        >
          {label}
        </span>
      </div>
      <div
        className="font-black leading-none"
        style={{
          fontSize: "clamp(11px, 2.1vw, 14px)",
          color: styles.valueColor,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          className="mt-0.5 opacity-60"
          style={{
            fontSize: "clamp(7px, 1.1vw, 8px)",
            color: styles.labelColor,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
