/**
 * BodyHologramView
 *
 * Componente de visualização holográfica das medidas antropométricas.
 *
 * Arquitetura:
 * - Imagem base (body-hologram.png) como fundo absoluto, soberana
 * - SVG overlay com viewBox="0 0 100 150" e preserveAspectRatio="xMidYMid meet"
 *   alinhado à proporção 2:3 da imagem (1024×1536 px)
 * - Pontos de ancoragem em coordenadas SVG calibradas pixel a pixel
 * - Linhas horizontais do ponto de ancoragem até a borda lateral
 * - Labels em cápsula SVG sempre dentro do viewBox
 * - Toggle entre "Perímetros" (azul/cyan) e "Dobras Cutâneas" (vermelho neon)
 * - Animação de flip 3D ao alternar modos
 *
 * Animações via Framer Motion (já instalado no projeto).
 * Zero dependências novas.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { MEASUREMENT_POINTS, SKINFOLD_POINTS } from "@/utils/measurement-points";
import type { AnthropometricAssessment } from "@shared/schema";

interface BodyHologramViewProps {
  assessment: AnthropometricAssessment;
}

type ViewMode = "perimeters" | "skinfolds";

// Paleta neon — Perímetros (Cyan)
const NEON_PERIMETERS = "#00e5ff";
const NEON_PERIMETERS_DIM = "#00e5ff55";

// Paleta neon — Dobras Cutâneas (Vermelho)
const NEON_SKINFOLDS = "#ff1744";
const NEON_SKINFOLDS_DIM = "#ff174455";

// Dimensões do viewBox SVG — proporção 2:3 (igual à imagem 1024×1536)
const VB_W = 100;
const VB_H = 150;

// Largura da cápsula de label
const LABEL_W = 23;
// Altura da cápsula de label
const LABEL_H = 9;
// Margem da borda lateral até o label
const EDGE_MARGIN = 1;
// Comprimento da linha do ponto até a cápsula
const LINE_GAP = 0.8; // pequeno gap entre ponto e início da linha

export function BodyHologramView({ assessment }: BodyHologramViewProps) {
  const [ready, setReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("perimeters");

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Seleciona os pontos de medição baseado no modo de visualização
  const pointsToUse =
    viewMode === "perimeters" ? MEASUREMENT_POINTS : SKINFOLD_POINTS;

  // Filtra apenas pontos com valor preenchido
  const activePoints = pointsToUse.filter((point) => {
    const value = (assessment as Record<string, unknown>)[point.key];
    return value != null && value !== "";
  });

  const hasFooter =
    assessment.weightKg != null ||
    (assessment.manualBodyFatPercent != null &&
      !Number.isNaN(assessment.manualBodyFatPercent));

  // Define a cor temática baseada no modo
  const themeColor =
    viewMode === "perimeters" ? NEON_PERIMETERS : NEON_SKINFOLDS;
  const themeColorDim =
    viewMode === "perimeters" ? NEON_PERIMETERS_DIM : NEON_SKINFOLDS_DIM;

  // Define o filtro CSS para a imagem base
  const imageFilter =
    viewMode === "perimeters"
      ? "none"
      : "hue-rotate(160deg) saturate(1.5) brightness(0.7)";

  // Define a unidade de medida
  const unit = viewMode === "perimeters" ? "cm" : "mm";

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "perimeters" ? "skinfolds" : "perimeters"));
  };

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-2xl"
      style={{
        background:
          "linear-gradient(180deg, #020d1a 0%, #031525 60%, #020d1a 100%)",
        aspectRatio: "2/3",
      }}
    >
      {/* Grade tecnológica */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,180,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Imagem base — soberana */}
      <motion.img
        key={`body-hologram-${viewMode}`}
        src="/body-hologram.png"
        alt="Silhueta holográfica do corpo humano"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{
          zIndex: 1,
          filter: imageFilter,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        draggable={false}
      />

      {/* Botão de toggle com legenda discreta — canto superior direito */}
      <div className="absolute top-3 right-3 z-30 flex flex-col items-center gap-1">
        <motion.button
          onClick={toggleViewMode}
          className="p-2 rounded-lg"
          style={{
            background: "rgba(1,8,22,0.85)",
            border: `1px solid ${themeColor}44`,
            color: themeColor,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
          }}
          whileHover={{
            scale: 1.1,
            boxShadow: `0 0 12px ${themeColor}66`,
          }}
          whileTap={{ scale: 0.95 }}
          title={
            viewMode === "perimeters"
              ? "Alternar para Dobras Cutâneas"
              : "Alternar para Perímetros"
          }
        >
          <RotateCcw size={18} />
        </motion.button>
        {/* Legenda dinâmica — indica a ação ao clicar */}
        <div
          className="text-[9px] font-semibold uppercase tracking-wider"
          style={{
            color: themeColor,
            opacity: 0.6,
            whiteSpace: "nowrap",
            letterSpacing: "0.5px",
          }}
        >
          {viewMode === "perimeters" ? "Ver Dobras" : "Ver Perímetros"}
        </div>
      </div>

      {/* SVG overlay — viewBox 100×150 alinhado à proporção 2:3 da imagem */}
      <motion.svg
        key={`svg-overlay-${viewMode}`}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
        xmlns="http://www.w3.org/2000/svg"
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <defs>
          {/* Filtro de glow neon */}
          <filter id="neon-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Filtro de glow para linhas — userSpaceOnUse evita corte em paths com height=0 */}
          <filter
            id="line-glow"
            filterUnits="userSpaceOnUse"
            x="-2"
            y="-2"
            width="104"
            height="154"
          >
            <feGaussianBlur stdDeviation="0.4" result="blur" />
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

            // Coordenadas do ponto de ancoragem no corpo
            const px = point.x;
            const py = point.y;

            // Posição X da borda do label
            const labelX = isLeft
              ? EDGE_MARGIN
              : VB_W - EDGE_MARGIN - LABEL_W;
            const labelY = py - LABEL_H / 2;

            // Linha: do ponto de ancoragem até a borda do label
            const lineX1 = isLeft ? px - LINE_GAP : px + LINE_GAP;
            const lineX2 = isLeft
              ? EDGE_MARGIN + LABEL_W
              : VB_W - EDGE_MARGIN - LABEL_W;

            const delay = index * 0.11;

            return (
              <g key={point.key}>
                {/* Ponto de ancoragem — círculo central */}
                <motion.circle
                  cx={px}
                  cy={py}
                  r={1.4}
                  fill={themeColor}
                  filter="url(#neon-glow)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay, duration: 0.25, ease: "easeOut" }}
                  style={{ transformOrigin: `${px}px ${py}px` }}
                />

                {/* Anel pulsante */}
                <motion.circle
                  cx={px}
                  cy={py}
                  r={3}
                  fill="none"
                  stroke={themeColor}
                  strokeWidth={0.4}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{
                    scale: [0.6, 2.2, 0.6],
                    opacity: [0.8, 0, 0.8],
                  }}
                  transition={{
                    delay: delay + 0.25,
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformOrigin: `${px}px ${py}px` }}
                />

                {/* Linha de conexão — do ponto até o card */}
                <motion.path
                  d={`M ${lineX1},${py} L ${lineX2},${py}`}
                  stroke={themeColor}
                  strokeWidth={0.55}
                  strokeOpacity={0.85}
                  fill="none"
                  filter="url(#line-glow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    delay: delay + 0.18,
                    duration: 0.38,
                    ease: "easeOut",
                  }}
                />

                {/* Cápsula do label */}
                <motion.rect
                  x={labelX}
                  y={labelY}
                  width={LABEL_W}
                  height={LABEL_H}
                  rx={LABEL_H / 2}
                  fill="rgba(1,8,22,0.88)"
                  stroke={themeColorDim}
                  strokeWidth={0.35}
                  initial={{ opacity: 0, x: isLeft ? 5 : -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + 0.42, duration: 0.28 }}
                />

                {/* Valor com unidade */}
                <motion.text
                  x={labelX + LABEL_W / 2}
                  y={labelY + 3.6}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fill={themeColor}
                  fontSize={3.0}
                  fontWeight="700"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  filter="url(#neon-glow)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.48, duration: 0.22 }}
                >
                  {value} {unit}
                </motion.text>

                {/* Nome da medida */}
                <motion.text
                  x={labelX + LABEL_W / 2}
                  y={labelY + 7.0}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fill={
                    viewMode === "perimeters"
                      ? "#7dd3fc"
                      : "#ff6b9d"
                  }
                  fontSize={2.3}
                  fontWeight="500"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.9 }}
                  transition={{ delay: delay + 0.52, duration: 0.22 }}
                >
                  {point.label}
                </motion.text>
              </g>
            );
          })}
      </motion.svg>

      {/* Rodapé: Peso e % Gordura */}
      {hasFooter && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: activePoints.length * 0.11 + 0.55,
            duration: 0.38,
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
              "linear-gradient(to top, rgba(2,13,26,0.97) 65%, transparent)",
          }}
        >
          {assessment.weightKg != null && (
            <div
              style={{
                flex: 1,
                background: "rgba(0,229,255,0.07)",
                border: `1px solid ${NEON_PERIMETERS}44`,
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
                  color: NEON_PERIMETERS,
                  fontSize: 18,
                  fontWeight: 800,
                  textShadow: `0 0 8px ${NEON_PERIMETERS}`,
                }}
              >
                {assessment.weightKg}
                <span
                  style={{ fontSize: 11, fontWeight: 500, marginLeft: 2 }}
                >
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
                  background: "rgba(249,115,22,0.09)",
                  border: "1px solid rgba(249,115,22,0.32)",
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
                  <span
                    style={{ fontSize: 11, fontWeight: 500, marginLeft: 1 }}
                  >
                    %
                  </span>
                </p>
                {assessment.manualBodyFatClassification && (
                  <p
                    style={{
                      color: "#fdba74",
                      fontSize: 9,
                      fontWeight: 500,
                      marginTop: 1,
                    }}
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
