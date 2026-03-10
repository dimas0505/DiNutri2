/**
 * Anchor coordinates (image-relative percentages) and side for each
 * anthropometric circumference measurement displayed in the "Corpo 3D" tab.
 *
 * Coordinates were derived from a 400 × 800 px hologram body illustration.
 *
 *  x  — horizontal anchor as % of image width  (0 = left edge, 100 = right edge)
 *  y  — vertical anchor as % of image height   (0 = top, 100 = bottom)
 *  side — which side the label line extends toward
 *
 * See imgToContainer() in body-hologram-view.tsx for the container-coordinate
 * conversion (the image occupies 52 % of the container, centered, leaving
 * 24 % margin on each side).
 */

export interface MeasurementPoint {
  x: number;
  y: number;
  side: "left" | "right";
  label: string;
}

export const MEASUREMENT_POINTS: Record<string, MeasurementPoint> = {
  // ── neck ─────────────────────────────────────
  circumNeck: { x: 44, y: 16.8, side: "left", label: "Pescoço" },

  // ── torso ────────────────────────────────────
  circumChest: { x: 75, y: 25.0, side: "right", label: "Tórax" },
  circumAbdomen: { x: 22, y: 30.6, side: "left", label: "Abdômen" },
  circumWaist: { x: 65, y: 35.0, side: "right", label: "Cintura" },
  circumHip: { x: 27, y: 42.5, side: "left", label: "Quadril" },

  // ── arms (non-dominant = right arm on illustration) ─────────────
  circumNonDominantArmContracted: {
    x: 80,
    y: 26.0,
    side: "right",
    label: "Braço Contraído",
  },
  circumNonDominantArmRelaxed: {
    x: 80,
    y: 29.5,
    side: "right",
    label: "Braço Relaxado",
  },

  // ── legs ─────────────────────────────────────
  circumNonDominantProximalThigh: {
    x: 75,
    y: 46.0,
    side: "right",
    label: "Coxa Proximal",
  },
  circumNonDominantCalf: { x: 28, y: 75.0, side: "left", label: "Panturrilha" },
};
