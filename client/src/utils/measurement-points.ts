/**
 * Mapa de pontos anatômicos para a visualização holográfica do corpo humano.
 *
 * Coordenadas em unidades do SVG viewBox="0 0 100 150",
 * calibradas pixel a pixel a partir da imagem de referência (1000431922.png — 1024×1536 px).
 *
 * Conversão: svgX = pixelX / 1024 × 100 | svgY = pixelY / 1536 × 150
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
 * Pontos de ancoragem calibrados a partir da imagem de referência.
 * Cada ponto corresponde à ponta da seta azul que toca o corpo.
 *
 * Pixel → SVG:
 *  Pescoço          px(467,271)  → svg(45.6, 26.5)
 *  Braço Contraído  px(429,367)  → svg(41.9, 35.8)  [ombro esquerdo]
 *  Tórax            px(530,430)  → svg(51.8, 42.1)  [peitoral]
 *  Braço Relaxado   px(419,500)  → svg(40.9, 48.8)  [braço esquerdo]
 *  Cintura          px(439,610)  → svg(42.9, 59.6)
 *  Abdômen          px(520,625)  → svg(50.8, 61.0)
 *  Quadril          px(520,760)  → svg(50.8, 74.2)
 *  Coxa Proximal    px(439,897)  → svg(42.9, 87.6)
 *  Panturrilha      px(420,1060) → svg(41.0,103.5)
 */
export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  {
    key: "circumNeck",
    label: "Pescoço",
    x: 45.6,
    y: 26.5,
    side: "right",
  },
  {
    key: "circumNonDominantArmContracted",
    label: "Braço Contraído",
    x: 41.9,
    y: 35.8,
    side: "left",
  },
  {
    key: "circumChest",
    label: "Tórax",
    x: 51.8,
    y: 42.1,
    side: "right",
  },
  {
    key: "circumNonDominantArmRelaxed",
    label: "Braço Relaxado",
    x: 40.9,
    y: 48.8,
    side: "left",
  },
  {
    key: "circumWaist",
    label: "Cintura",
    x: 42.9,
    y: 59.6,
    side: "left",
  },
  {
    key: "circumAbdomen",
    label: "Abdômen",
    x: 50.8,
    y: 61.0,
    side: "right",
  },
  {
    key: "circumHip",
    label: "Quadril",
    x: 50.8,
    y: 74.2,
    side: "right",
  },
  {
    key: "circumNonDominantProximalThigh",
    label: "Coxa Proximal",
    x: 42.9,
    y: 87.6,
    side: "left",
  },
  {
    key: "circumNonDominantCalf",
    label: "Panturrilha",
    x: 41.0,
    y: 103.5,
    side: "left",
  },
];
