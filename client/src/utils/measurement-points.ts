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
 * Cada ponto corresponde à localização anatômica na silhueta holográfica.
 *
 * Coordenadas rastreadas pixel a pixel — v3 (alinhamento corrigido).
 */
export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  {
    key: "circumNeck",
    label: "Pescoço",
    x: 54.7,
    y: 32.2,
    side: "right",
  },
  {
    key: "circumNonDominantArmContracted",
    label: "Braço Contraído",
    x: 36.3,
    y: 43.3,
    side: "left",
  },
  {
    key: "circumChest",
    label: "Tórax",
    x: 44.1,
    y: 42.3,
    side: "right",
  },
  {
    key: "circumNonDominantArmRelaxed",
    label: "Braço Relaxado",
    x: 36.0,
    y: 64.4,
    side: "left",
  },
  {
    key: "circumWaist",
    label: "Cintura",
    x: 48.7,
    y: 54.1,
    side: "left",
  },
  {
    key: "circumAbdomen",
    label: "Abdômen",
    x: 49.6,
    y: 59.6,
    side: "right",
  },
  {
    key: "circumHip",
    label: "Quadril",
    x: 55.3,
    y: 69.9,
    side: "right",
  },
  {
    key: "circumNonDominantProximalThigh",
    label: "Coxa Proximal",
    x: 43.4,
    y: 75.8,
    side: "left",
  },
  {
    key: "circumNonDominantCalf",
    label: "Panturrilha",
    x: 46.9,
    y: 92.5,
    side: "left",
  },
];

export const SKINFOLD_POINTS: MeasurementPoint[] = [
  {
    key: "foldBiceps",
    label: "Bicipital",
    x: 39.8,
    y: 46,
    side: "left",
  },
  {
    key: "foldTriceps",
    label: "Tricipital",
    x: 64.4,
    y: 44.4,
    side: "right",
  },
  {
    key: "foldSubscapular",
    label: "Subescapular",
    x: 40,
    y: 33.8,
    side: "left",
  },
  {
    key: "foldSuprailiac",
    label: "Suprailíaca",
    x: 45,
    y: 53.6,
    side: "left",
  },
];
