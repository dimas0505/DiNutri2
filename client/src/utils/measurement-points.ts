/**
 * Mapa de pontos anatômicos para a visualização holográfica do corpo humano.
 *
 * Coordenadas em % relativas à imagem base (body-hologram.png).
 * A imagem possui dimensões 1024×1536 px.
 *
 * Cada ponto define:
 *  - key: campo correspondente em AnthropometricAssessment
 *  - label: nome exibido no overlay
 *  - x, y: posição do ponto de ancoragem em % da imagem (0–100)
 *  - side: "left" | "right" — de qual lado o label será exibido
 */

export interface MeasurementPoint {
  key: string;
  label: string;
  /** Posição horizontal do ponto de ancoragem em % da imagem (0–100) */
  x: number;
  /** Posição vertical do ponto de ancoragem em % da imagem (0–100) */
  y: number;
  /** Lado em que o label será exibido */
  side: "left" | "right";
}

/**
 * Coordenadas calibradas pixel a pixel a partir da imagem de referência
 * (1000431922.png — 1024×1536 px).
 *
 * Mapeamento:
 *  Pescoço        → topo do pescoço, lado direito
 *  Braço Contraído → ombro esquerdo / bíceps, lado esquerdo
 *  Tórax          → peitoral, lado direito
 *  Braço Relaxado  → braço esquerdo relaxado, lado esquerdo
 *  Abdômen        → região abdominal, lado direito
 *  Cintura        → cintura, lado esquerdo
 *  Quadril        → quadril, lado direito
 *  Coxa Proximal  → coxa esquerda proximal, lado esquerdo
 *  Panturrilha    → panturrilha esquerda, lado esquerdo
 */
export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  {
    key: "circumNeck",
    label: "Pescoço",
    x: 52,
    y: 17.5,
    side: "right",
  },
  {
    key: "circumNonDominantArmContracted",
    label: "Braço Contraído",
    x: 36,
    y: 27,
    side: "left",
  },
  {
    key: "circumChest",
    label: "Tórax",
    x: 57,
    y: 33,
    side: "right",
  },
  {
    key: "circumNonDominantArmRelaxed",
    label: "Braço Relaxado",
    x: 34,
    y: 38,
    side: "left",
  },
  {
    key: "circumAbdomen",
    label: "Abdômen",
    x: 60,
    y: 44.5,
    side: "right",
  },
  {
    key: "circumWaist",
    label: "Cintura",
    x: 38,
    y: 44.5,
    side: "left",
  },
  {
    key: "circumHip",
    label: "Quadril",
    x: 60,
    y: 53,
    side: "right",
  },
  {
    key: "circumNonDominantProximalThigh",
    label: "Coxa Proximal",
    x: 38,
    y: 60,
    side: "left",
  },
  {
    key: "circumNonDominantCalf",
    label: "Panturrilha",
    x: 36,
    y: 75,
    side: "left",
  },
];
