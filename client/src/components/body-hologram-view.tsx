import { motion } from "framer-motion";
import { Percent, Weight } from "lucide-react";
import type { AnthropometricAssessment } from "@shared/schema";
import { MEASUREMENT_POINTS } from "@/lib/measurement-points";

interface BodyHologramViewProps {
  assessment: AnthropometricAssessment;
}

/**
 * Converts image-relative x-percentage to container-relative x-percentage.
 *
 * The hologram image occupies exactly 52 % of the container width and is
 * centred, leaving 24 % empty margins on each side.
 *
 *   containerX = 24 + imgX * 0.52
 */
function imgToContainer(imgX: number): number {
  return 24 + imgX * 0.52;
}

export function BodyHologramView({ assessment }: BodyHologramViewProps) {
  // Build the list of overlay items for filled measurements only
  const activePoints = (
    Object.entries(MEASUREMENT_POINTS) as [
      keyof AnthropometricAssessment,
      (typeof MEASUREMENT_POINTS)[string],
    ][]
  )
    .filter(([key]) => {
      const value = assessment[key];
      return value != null && value !== "";
    })
    .map(([key, point], index) => ({
      ...point,
      value: assessment[key] as number,
      delay: 0.4 + index * 0.2,
    }));

  const hasWeight =
    assessment.weightKg != null && assessment.weightKg !== undefined;
  const hasFat =
    assessment.manualBodyFatPercent != null &&
    !Number.isNaN(assessment.manualBodyFatPercent);

  return (
    <div className="space-y-4">
      {/* ── hologram container ─────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden rounded-2xl select-none"
        style={{
          // 1 : 2 aspect ratio keeps the full-body hologram visible
          paddingBottom: "200%",
          background: "linear-gradient(180deg, #050814 0%, #0a0f2e 100%)",
        }}
      >
        {/* Subtle scanline overlay for the holographic feel */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,255,220,0.08) 0px, rgba(0,255,220,0.08) 1px, transparent 1px, transparent 4px)",
          }}
        />

        {/* Base hologram image — UI overlays are rendered on top via absolute
            positioning; the body shape itself is never reproduced in SVG/Canvas */}
        <img
          src="/body-hologram.png"
          alt="Visualização corporal 3D"
          className="absolute top-0 h-full object-contain pointer-events-none"
          style={{ left: "24%", width: "52%" }}
          draggable={false}
        />

        {/* ── measurement overlays ─────────────────────────────────── */}
        {activePoints.map((point) => {
          const anchorX = imgToContainer(point.x); // % of container
          const anchorY = point.y; // % of container height
          const isLeft = point.side === "left";

          return (
            <div key={point.label} className="absolute inset-0 pointer-events-none">
              {/* Pulsing neon dot */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: point.delay, duration: 0.3, ease: "backOut" }}
                style={{
                  position: "absolute",
                  left: `${anchorX}%`,
                  top: `${anchorY}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 20,
                }}
              >
                {/* outer glow ring */}
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0.1, 0.6] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: point.delay,
                  }}
                  style={{
                    position: "absolute",
                    inset: "-6px",
                    borderRadius: "50%",
                    background: "rgba(0,255,220,0.25)",
                  }}
                />
                {/* core dot */}
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: point.delay,
                  }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#00ffdc",
                    boxShadow: "0 0 6px #00ffdc, 0 0 12px #00ffdc88",
                  }}
                />
              </motion.div>

              {/* Horizontal dashed line from anchor to container edge */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  delay: point.delay + 0.25,
                  duration: 0.45,
                  ease: "easeOut",
                }}
                style={{
                  position: "absolute",
                  top: `${anchorY}%`,
                  left: isLeft ? 0 : `${anchorX}%`,
                  width: isLeft ? `${anchorX}%` : `${100 - anchorX}%`,
                  height: 1,
                  background:
                    "repeating-linear-gradient(90deg, #00ffdc 0px, #00ffdc 4px, transparent 4px, transparent 8px)",
                  transformOrigin: isLeft ? "right center" : "left center",
                  zIndex: 15,
                }}
              />

              {/* Label capsule */}
              <motion.div
                initial={{ opacity: 0, x: isLeft ? 12 : -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: point.delay + 0.7,
                  duration: 0.35,
                  ease: "easeOut",
                }}
                style={{
                  position: "absolute",
                  top: `${anchorY}%`,
                  ...(isLeft ? { left: "1%" } : { right: "1%" }),
                  transform: "translateY(-50%)",
                  maxWidth: "22%",
                  zIndex: 25,
                }}
              >
                <div
                  style={{
                    background: "rgba(0,255,220,0.12)",
                    border: "1px solid rgba(0,255,220,0.45)",
                    borderRadius: 99,
                    padding: "3px 8px",
                    backdropFilter: "blur(4px)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.48rem",
                      color: "rgba(0,255,220,0.75)",
                      lineHeight: 1.2,
                      marginBottom: 1,
                    }}
                  >
                    {point.label}
                  </p>
                  <p
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: "#00ffdc",
                      lineHeight: 1,
                    }}
                  >
                    {point.value} cm
                  </p>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* ── bottom summary cards ──────────────────────────────────── */}
      {(hasWeight || hasFat) && (
        <div className="grid grid-cols-2 gap-3">
          {hasWeight && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: "linear-gradient(135deg, #1a0a3e 0%, #2d1a5e 100%)",
                border: "1px solid rgba(120,80,255,0.35)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 36,
                  height: 36,
                  background: "rgba(120,80,255,0.2)",
                }}
              >
                <Weight className="h-4 w-4 text-purple-300" />
              </div>
              <div>
                <p className="text-xs text-purple-300 font-medium">Peso</p>
                <p className="text-lg font-bold text-white leading-none">
                  {assessment.weightKg}
                  <span className="text-xs font-normal text-purple-300 ml-1">
                    kg
                  </span>
                </p>
              </div>
            </motion.div>
          )}

          {hasFat && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: "linear-gradient(135deg, #2a0a0a 0%, #4a1a00 100%)",
                border: "1px solid rgba(249,115,22,0.35)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 36,
                  height: 36,
                  background: "rgba(249,115,22,0.2)",
                }}
              >
                <Percent className="h-4 w-4 text-orange-300" />
              </div>
              <div>
                <p className="text-xs text-orange-300 font-medium">% Gordura</p>
                <p className="text-lg font-bold text-white leading-none">
                  {assessment.manualBodyFatPercent}
                  <span className="text-xs font-normal text-orange-300 ml-0.5">
                    %
                  </span>
                </p>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
