/**
 * Mapa de pontos anatômicos para a visualização holográfica do corpo humano.
 *
 * Coordenadas em % relativas à imagem base (body-hologram.png — 1024×1536 px).
 * O SVG overlay usa viewBox="0 0 100 150" com preserveAspectRatio="xMidYMid meet",
 * portanto x ∈ [0,100] e y ∈ [0,150].
 *
 * Cada ponto define:
 *  - key: campo correspondente em AnthropometricAssessment
 *  - label: nome exibido no overlay
 *  - x: posição horizontal em unidades SVG (0–100)
 *  - y: posição vertical em unidades SVG (0–150)
 *  - side: "left" | "right" — de qual lado o label será exibido
 */

export interface MeasurementPoint {
  key: string;
  label: string;
  /** Posição horizontal em unidades SVG (0–100) */
  x: number;
  /** Posição vertical em unidades SVG (0–150) */
  y: number;
  /** Lado em que o label será exibido */
  side: "left" | "right";
}

/**
 * Coordenadas calibradas a partir da imagem de referência (1000431922.png).
 * Imagem: 1024×1536 px → SVG viewBox: 100×150.
 * Conversão: svgX = pixelX / 1024 * 100 ; svgY = pixelY / 1536 * 150
 *
 * Pontos de ancoragem (onde a seta toca o corpo na imagem de referência):
 *
 *  Pescoço          → px ≈ (530, 268)  → svgX=51.8, svgY=26.2
 *  Braço Contraído  → px ≈ (370, 415)  → svgX=36.1, svgY=40.5
 *  Tórax            → px ≈ (585, 505)  → svgX=57.1, svgY=49.3
 *  Braço Relaxado   → px ≈ (348, 560)  → svgX=34.0, svgY=54.7
 *  Cintura          → px ≈ (390, 680)  → svgX=38.1, svgY=66.4
 *  Abdômen          → px ≈ (615, 680)  → svgX=60.1, svgY=66.4
 *  Quadril          → px ≈ (615, 810)  → svgX=60.1, svgY=79.1
 *  Coxa Proximal    → px ≈ (390, 920)  → svgX=38.1, svgY=89.8
 *  Panturrilha      → px ≈ (370, 1150) → svgX=36.1, svgY=112.3
 */
export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  {
    key: "circumNeck",
    label: "Pescoço",
    x: 51.8,
    y: 26.2,
    side: "right",
  },
  {
    key: "circumNonDominantArmContracted",
    label: "Braço Contraído",
    x: 36.1,
    y: 40.5,
    side: "left",
  },
  {
    key: "circumChest",
    label: "Tórax",
    x: 57.1,
    y: 49.3,
    side: "right",
  },
  {
    key: "circumNonDominantArmRelaxed",
    label: "Braço Relaxado",
    x: 34.0,
    y: 54.7,
    side: "left",
  },
  {
    key: "circumWaist",
    label: "Cintura",
    x: 38.1,
    y: 66.4,
    side: "left",
  },
  {
    key: "circumAbdomen",
    label: "Abdômen",
    x: 60.1,
    y: 66.4,
    side: "right",
  },
  {
    key: "circumHip",
    label: "Quadril",
    x: 60.1,
    y: 79.1,
    side: "right",
  },
  {
    key: "circumNonDominantProximalThigh",
    label: "Coxa Proximal",
    x: 38.1,
    y: 89.8,
    side: "left",
  },
  {
    key: "circumNonDominantCalf",
    label: "Panturrilha",
    x: 36.1,
    y: 112.3,
    side: "left",
  },
];
