/**
 * BodyHologramView
 *
 * Exibe a imagem holográfica do corpo humano como arte-base fixa
 * e sobrepõe dinamicamente pontos, linhas e labels apenas para as
 * medidas antropométricas realmente presentes na avaliação.
 *
 * Abordagem de posicionamento:
 * - A imagem ocupa 60% da largura do container e fica centralizada
 * - Os pontos são posicionados em % RELATIVO À IMAGEM (não ao container)
 * - Os labels ficam nas faixas laterais (20% esq / 20% dir)
 * - Linhas SVG conectam ponto → label dentro do container
 *
 * Imagem base: body-hologram.png (1024×1536px, proporção 2:3)
 */

import { motion, useReducedMotion } from "framer-motion";
import { Percent, Weight } from "lucide-react";
import type { AnthropometricAssessment } from "@shared/schema";
import { getActivePoints } from "./measurement-points";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BodyHologramViewProps {
  data: AnthropometricAssessment;
}

// ─── Constantes de layout ─────────────────────────────────────────────────────

/**
 * A imagem ocupa esta fração da largura do container (centralizada).
 * Margem lateral = (1 - IMG_WIDTH_FRACTION) / 2
 */
const IMG_WIDTH_FRACTION = 0.52; // 52% da largura do container
const IMG_LEFT_OFFSET = (1 - IMG_WIDTH_FRACTION) / 2; // 24% de margem de cada lado

/**
 * A imagem ocupa esta fração da altura do container.
 * Usamos object-contain, então a imagem preenche a altura total
 * mas pode ter barras laterais. Como a proporção é 2:3 e o container
 * também é 2:3, a imagem preenche 100% da altura.
 */
const IMG_TOP_OFFSET = 0.0; // sem margem vertical

// ─── Helpers de conversão ─────────────────────────────────────────────────────

/**
 * Converte coordenadas em % relativas à imagem
 * para % relativas ao container total.
 */
function imgToContainer(xImg: number, yImg: number): { x: number; y: number } {
  return {
    x: IMG_LEFT_OFFSET * 100 + xImg * IMG_WIDTH_FRACTION,
    y: IMG_TOP_OFFSET * 100 + yImg,
  };
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

      {/* ── Overlay SVG: apenas as linhas de conexão ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ zIndex: 2 }}
        aria-hidden="true"
      >
        {activePoints.map((point, i) => {
          const anchor = imgToContainer(point.anchor.x, point.anchor.y);
          const isRight = point.side === "right";

          // Extremidade da linha: borda interna da área de labels
          const lineEndX = isRight
            ? IMG_LEFT_OFFSET * 100 + IMG_WIDTH_FRACTION * 100 + 2 // borda direita da imagem + 2%
            : IMG_LEFT_OFFSET * 100 - 2; // borda esquerda da imagem - 2%

          return (
            <motion.line
              key={point.id}
              x1={anchor.x}
              y1={anchor.y}
              x2={lineEndX}
              y2={anchor.y}
              stroke={NEON}
              strokeWidth="0.35"
              strokeDasharray="1.5 1"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{
                delay: shouldReduceMotion ? 0 : 0.4 + i * 0.1,
                duration: shouldReduceMotion ? 0 : 0.45,
                ease: "easeOut",
              }}
            />
          );
        })}
      </svg>

      {/* ── Pontos de ancoragem (posicionados sobre a imagem) ── */}
      {activePoints.map((point, i) => {
        const anchor = imgToContainer(point.anchor.x, point.anchor.y);

        return (
          <motion.div
            key={`dot-${point.id}`}
            className="absolute rounded-full"
            style={{
              zIndex: 3,
              width: 8,
              height: 8,
              background: NEON,
              boxShadow: `0 0 6px ${NEON}, 0 0 12px ${NEON}`,
              left: `${anchor.x}%`,
              top: `${anchor.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={
              shouldReduceMotion
                ? { opacity: 1, scale: 1 }
                : {
                    opacity: [0, 1, 0.6, 1],
                    scale: [0, 1.4, 1, 1.2],
                  }
            }
            transition={{
              delay: shouldReduceMotion ? 0 : 0.4 + i * 0.1,
              duration: shouldReduceMotion ? 0.1 : 0.55,
              repeat: shouldReduceMotion ? 0 : Infinity,
              repeatDelay: 3,
              repeatType: "loop",
            }}
          />
        );
      })}

      {/* ── Labels HTML flutuantes ── */}
      {activePoints.map((point, i) => {
        const anchor = imgToContainer(point.anchor.x, point.anchor.y);
        const isRight = point.side === "right";

        return (
          <motion.div
            key={`label-${point.id}`}
            role="note"
            aria-label={`${point.label}: ${point.value} ${point.unit}`}
            initial={{ opacity: 0, x: isRight ? 8 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: shouldReduceMotion ? 0 : 0.55 + i * 0.1,
              duration: shouldReduceMotion ? 0 : 0.3,
              ease: "easeOut",
            }}
            className="absolute"
            style={{
              zIndex: 4,
              top: `${anchor.y}%`,
              transform: "translateY(-50%)",
              // Labels da direita: começam após a borda direita da imagem
              // Labels da esquerda: terminam antes da borda esquerda da imagem
              ...(isRight
                ? {
                    left: `${IMG_LEFT_OFFSET * 100 + IMG_WIDTH_FRACTION * 100 + 3}%`,
                    right: "1%",
                  }
                : {
                    right: `${(1 - IMG_LEFT_OFFSET) * 100 - IMG_WIDTH_FRACTION * 100 + 3}%`,
                    left: "1%",
                  }),
            }}
          >
            <div
              className="px-2.5 py-1.5 rounded-full w-full"
              style={{
                background: "linear-gradient(135deg, rgba(224,242,254,0.95) 0%, rgba(186,230,253,0.92) 100%)",
                border: `1px solid ${NEON_DIM}`,
                boxShadow: `0 0 8px rgba(34,211,238,0.15), inset 0 1px 0 rgba(255,255,255,0.65)`,
                backdropFilter: "blur(3px)",
              }}
            >
              <div
                className="font-black leading-none whitespace-nowrap overflow-hidden text-ellipsis"
                style={{
                  fontSize: "clamp(9px, 1.8vw, 12px)",
                  color: "#0c4a6e",
                }}
              >
                {point.value} {point.unit}
              </div>
              <div
                className="leading-none mt-0.5 opacity-75 uppercase tracking-wide whitespace-nowrap overflow-hidden text-ellipsis"
                style={{
                  fontSize: "clamp(7px, 1.2vw, 9px)",
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
          style={{ zIndex: 5 }}
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
      <div className="absolute top-3 left-3" style={{ zIndex: 5 }}>
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
          zIndex: 5,
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
      bg: "linear-gradient(135deg, rgba(224,242,254,0.95) 0%, rgba(186,230,253,0.92) 100%)",
      border: "rgba(34,211,238,0.45)",
      labelColor: "#075985",
      valueColor: "#0c4a6e",
    },
    orange: {
      bg: "linear-gradient(135deg, rgba(255,237,213,0.95) 0%, rgba(254,215,170,0.92) 100%)",
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
