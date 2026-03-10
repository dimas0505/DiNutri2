/**
 * BodyHologramView
 *
 * Componente de visualização holográfica das medidas antropométricas.
 * Usa um SVG overlay com viewBox="0 0 100 150" alinhado à proporção da imagem
 * base (1024×1536 px → razão 2:3), garantindo que todos os elementos fiquem
 * perfeitamente sobrepostos à silhueta independentemente do tamanho da tela.
 *
 * Apenas as medidas efetivamente preenchidas são exibidas.
 * Animações via Framer Motion (já instalado no projeto).
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MEASUREMENT_POINTS } from "@/utils/measurement-points";
import type { AnthropometricAssessment } from "@shared/schema";

interface BodyHologramViewProps {
  assessment: AnthropometricAssessment;
}

const NEON = "#00e5ff";
const NEON_DIM = "#00e5ff88";

// Dimensões do viewBox SVG — proporção 2:3 (igual à imagem 1024×1536)
const VB_W = 100;
const VB_H = 150;

// Largura reservada para o label em unidades do viewBox
const LABEL_W = 22;
// Margem lateral mínima do label até a borda do SVG
const LABEL_MARGIN = 1.5;
// Comprimento fixo da linha de conexão
const LINE_LEN = 8;

export function BodyHologramView({ assessment }: BodyHologramViewProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const activePoints = MEASUREMENT_POINTS.filter((point) => {
    const value = (assessment as Record<string, unknown>)[point.key];
    return value != null && value !== "";
  });

  const hasFooter =
    assessment.weightKg != null ||
    (assessment.manualBodyFatPercent != null &&
      !Number.isNaN(assessment.manualBodyFatPercent));

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(180deg, #020d1a 0%, #031525 60%, #020d1a 100%)",
        aspectRatio: "2/3",
      }}
    >
      {/* Grade tecnológica de fundo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,180,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Imagem base — soberana, nunca substituída por código */}
      <img
        src="/body-hologram.png"
        alt="Silhueta holográfica do corpo humano"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{ zIndex: 1 }}
        draggable={false}
      />

      {/* SVG overlay — viewBox alinhado à proporção 2:3 da imagem */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {ready &&
          activePoints.map((point, index) => {
            const value = (assessment as Record<string, unknown>)[
              point.key
            ] as number;
            const isLeft = point.side === "left";

            // Ponto de ancoragem no corpo (em unidades do viewBox)
            const px = (point.x / 100) * VB_W;
            const py = (point.y / 100) * VB_H;

            // Extremidade da linha (lado oposto ao label)
            const lineEndX = isLeft ? px - LINE_LEN : px + LINE_LEN;

            // Posição X do label
            const labelX = isLeft
              ? LABEL_MARGIN
              : VB_W - LABEL_MARGIN - LABEL_W;

            // Centro vertical do label
            const labelCY = py;
            const labelH = 8;
            const labelY = labelCY - labelH / 2;

            // Linha vai do ponto até a borda do label
            const lineStartX = px;
            const lineFinishX = isLeft
              ? LABEL_MARGIN + LABEL_W
              : VB_W - LABEL_MARGIN - LABEL_W;

            const delay = index * 0.13;

            return (
              <g key={point.key}>
                {/* Ponto de ancoragem pulsante */}
                <motion.circle
                  cx={px}
                  cy={py}
                  r={1.2}
                  fill={NEON}
                  filter="url(#glow)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay, duration: 0.3 }}
                  style={{ transformOrigin: `${px}px ${py}px` }}
                />
                {/* Anel pulsante externo */}
                <motion.circle
                  cx={px}
                  cy={py}
                  r={2.5}
                  fill="none"
                  stroke={NEON}
                  strokeWidth={0.4}
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{ scale: [0.8, 2, 0.8], opacity: [0.7, 0, 0.7] }}
                  transition={{
                    delay: delay + 0.3,
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformOrigin: `${px}px ${py}px` }}
                />

                {/* Linha de conexão */}
                <motion.line
                  x1={lineStartX}
                  y1={py}
                  x2={lineFinishX}
                  y2={py}
                  stroke={NEON}
                  strokeWidth={0.35}
                  strokeOpacity={0.85}
                  filter="url(#glow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: delay + 0.2, duration: 0.4, ease: "easeOut" }}
                />

                {/* Cápsula do label */}
                <motion.rect
                  x={labelX}
                  y={labelY}
                  width={LABEL_W}
                  height={labelH}
                  rx={labelH / 2}
                  fill="rgba(0,10,30,0.82)"
                  stroke={NEON_DIM}
                  strokeWidth={0.3}
                  initial={{ opacity: 0, x: isLeft ? 4 : -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + 0.45, duration: 0.3 }}
                />

                {/* Valor em cm */}
                <motion.text
                  x={isLeft ? labelX + LABEL_W / 2 : labelX + LABEL_W / 2}
                  y={labelY + 3.2}
                  textAnchor="middle"
                  fill={NEON}
                  fontSize={2.8}
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                  filter="url(#glow)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.5, duration: 0.25 }}
                >
                  {value} cm
                </motion.text>

                {/* Nome da medida */}
                <motion.text
                  x={isLeft ? labelX + LABEL_W / 2 : labelX + LABEL_W / 2}
                  y={labelY + 6.2}
                  textAnchor="middle"
                  fill="#7dd3fc"
                  fontSize={2.2}
                  fontWeight="500"
                  fontFamily="system-ui, sans-serif"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.9 }}
                  transition={{ delay: delay + 0.55, duration: 0.25 }}
                >
                  {point.label}
                </motion.text>
              </g>
            );
          })}
      </svg>

      {/* Rodapé com peso e % gordura */}
      {hasFooter && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: activePoints.length * 0.13 + 0.6,
            duration: 0.4,
          }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            display: "flex",
            gap: 8,
            padding: "10px 12px",
            background:
              "linear-gradient(to top, rgba(2,13,26,0.97) 70%, transparent)",
          }}
        >
          {assessment.weightKg != null && (
            <div
              style={{
                flex: 1,
                background: "rgba(0,229,255,0.08)",
                border: `1px solid ${NEON}44`,
                borderRadius: 12,
                padding: "8px 12px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  color: "#7dd3fc",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Peso
              </p>
              <p
                style={{
                  color: NEON,
                  fontSize: 18,
                  fontWeight: 800,
                  textShadow: `0 0 8px ${NEON}`,
                }}
              >
                {assessment.weightKg}
                <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 2 }}>
                  kg
                </span>
              </p>
            </div>
          )}
          {assessment.manualBodyFatPercent != null &&
            !Number.isNaN(assessment.manualBodyFatPercent) && (
              <div
                style={{
                  flex: 1,
                  background: "rgba(249,115,22,0.10)",
                  border: "1px solid rgba(249,115,22,0.35)",
                  borderRadius: 12,
                  padding: "8px 12px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    color: "#fdba74",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  % Gordura
                </p>
                <p
                  style={{
                    color: "#fb923c",
                    fontSize: 18,
                    fontWeight: 800,
                    textShadow: "0 0 8px #fb923c88",
                  }}
                >
                  {assessment.manualBodyFatPercent}
                  <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 1 }}>
                    %
                  </span>
                </p>
                {assessment.manualBodyFatClassification && (
                  <p
                    style={{ color: "#fdba74", fontSize: 9, fontWeight: 500, marginTop: 1 }}
                  >
                    {assessment.manualBodyFatClassification}
                  </p>
                )}
              </div>
            )}
        </motion.div>
      )}
    </div>
  );
}
