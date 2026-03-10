/**
 * BodyHologramView
 *
 * Componente de visualização holográfica das medidas antropométricas.
 * Sobrepõe pontos de ancoragem pulsantes, linhas e labels sobre a imagem
 * base do corpo humano (body-hologram.png), usando coordenadas em % para
 * posicionamento absoluto responsivo.
 *
 * Apenas as medidas efetivamente preenchidas são exibidas.
 * Animações via Framer Motion (já instalado no projeto).
 */

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MEASUREMENT_POINTS } from "@/utils/measurement-points";
import type { AnthropometricAssessment } from "@shared/schema";

interface BodyHologramViewProps {
  assessment: AnthropometricAssessment;
}

/**
 * Converte coordenadas em % da imagem para coordenadas em % do container.
 *
 * A imagem ocupa 52% da largura do container e está centralizada,
 * portanto há 24% de margem em cada lado.
 *
 * imgX e imgY são valores de 0 a 100 relativos à imagem.
 * Retorna { left, top } em % do container.
 */
function imgToContainer(imgX: number, imgY: number) {
  const imgWidthRatio = 0.52; // imagem ocupa 52% da largura do container
  const marginLeft = (1 - imgWidthRatio) / 2; // 24% de margem em cada lado
  const left = marginLeft * 100 + imgX * imgWidthRatio;
  const top = imgY; // altura não é ajustada (imagem preenche 100% da altura)
  return { left, top };
}

const NEON_COLOR = "#00e5ff";
const NEON_GLOW = "0 0 8px #00e5ff, 0 0 16px #00e5ff88";

export function BodyHologramView({ assessment }: BodyHologramViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Aguarda a imagem carregar antes de exibir os overlays
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Filtra apenas os pontos com valor preenchido
  const activePoints = MEASUREMENT_POINTS.filter((point) => {
    const value = (assessment as Record<string, unknown>)[point.key];
    return value != null && value !== "";
  });

  return (
    <div
      ref={containerRef}
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

      {/* Imagem base holográfica — soberana, nunca substituída por código */}
      <img
        src="/body-hologram.png"
        alt="Silhueta holográfica do corpo humano"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{ zIndex: 1 }}
        draggable={false}
      />

      {/* Overlays dinâmicos */}
      <AnimatePresence>
        {ready &&
          activePoints.map((point, index) => {
            const value = (assessment as Record<string, unknown>)[point.key] as number;
            const { left, top } = imgToContainer(point.x, point.y);
            const isLeft = point.side === "left";

            // Comprimento da linha horizontal em % do container
            const lineLength = isLeft ? left - 4 : 96 - left;

            return (
              <g key={point.key} style={{ position: "absolute", zIndex: 10 }}>
                {/* Ponto pulsante */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.12, duration: 0.3, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: `${top}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 12,
                  }}
                >
                  {/* Anel pulsante externo */}
                  <motion.div
                    animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
                    style={{
                      position: "absolute",
                      inset: -6,
                      borderRadius: "50%",
                      border: `1.5px solid ${NEON_COLOR}`,
                    }}
                  />
                  {/* Ponto central */}
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: NEON_COLOR,
                      boxShadow: NEON_GLOW,
                    }}
                  />
                </motion.div>

                {/* Linha horizontal animada */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: index * 0.12 + 0.2, duration: 0.35, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    top: `${top}%`,
                    ...(isLeft
                      ? { left: `4%`, width: `${lineLength}%`, transformOrigin: "right center" }
                      : { left: `${left}%`, width: `${lineLength}%`, transformOrigin: "left center" }),
                    height: 1.5,
                    background: `linear-gradient(${isLeft ? "to left" : "to right"}, transparent, ${NEON_COLOR})`,
                    transform: "translateY(-50%)",
                    boxShadow: `0 0 4px ${NEON_COLOR}88`,
                    zIndex: 11,
                  }}
                />

                {/* Label em cápsula */}
                <motion.div
                  initial={{ opacity: 0, x: isLeft ? 12 : -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.12 + 0.45, duration: 0.3, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    top: `${top}%`,
                    ...(isLeft ? { left: "2%" } : { right: "2%" }),
                    transform: "translateY(-50%)",
                    zIndex: 13,
                  }}
                >
                  <div
                    style={{
                      background: "rgba(0,10,30,0.82)",
                      border: `1px solid ${NEON_COLOR}66`,
                      borderRadius: 20,
                      padding: "3px 8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isLeft ? "flex-start" : "flex-end",
                      backdropFilter: "blur(4px)",
                      boxShadow: `0 0 8px ${NEON_COLOR}22`,
                      minWidth: 60,
                    }}
                  >
                    <span
                      style={{
                        color: NEON_COLOR,
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        letterSpacing: 0.2,
                        textShadow: `0 0 6px ${NEON_COLOR}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {value} cm
                    </span>
                    <span
                      style={{
                        color: "#7dd3fc",
                        fontSize: 9,
                        fontWeight: 500,
                        lineHeight: 1.2,
                        letterSpacing: 0.3,
                        whiteSpace: "nowrap",
                        opacity: 0.85,
                      }}
                    >
                      {point.label}
                    </span>
                  </div>
                </motion.div>
              </g>
            );
          })}
      </AnimatePresence>

      {/* Rodapé com peso e % gordura */}
      {(assessment.weightKg != null || assessment.manualBodyFatPercent != null) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: activePoints.length * 0.12 + 0.6, duration: 0.4 }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            display: "flex",
            gap: 8,
            padding: "10px 12px",
            background: "linear-gradient(to top, rgba(2,13,26,0.95) 80%, transparent)",
          }}
        >
          {assessment.weightKg != null && (
            <div
              style={{
                flex: 1,
                background: "rgba(0,229,255,0.08)",
                border: `1px solid ${NEON_COLOR}44`,
                borderRadius: 12,
                padding: "8px 12px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#7dd3fc", fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
                Peso
              </p>
              <p style={{ color: NEON_COLOR, fontSize: 18, fontWeight: 800, textShadow: `0 0 8px ${NEON_COLOR}` }}>
                {assessment.weightKg}
                <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 2 }}>kg</span>
              </p>
            </div>
          )}
          {assessment.manualBodyFatPercent != null && !Number.isNaN(assessment.manualBodyFatPercent) && (
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
              <p style={{ color: "#fdba74", fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
                % Gordura
              </p>
              <p style={{ color: "#fb923c", fontSize: 18, fontWeight: 800, textShadow: "0 0 8px #fb923c88" }}>
                {assessment.manualBodyFatPercent}
                <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 1 }}>%</span>
              </p>
              {assessment.manualBodyFatClassification && (
                <p style={{ color: "#fdba74", fontSize: 9, fontWeight: 500, marginTop: 1 }}>
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
