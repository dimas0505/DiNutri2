import type { AnthropometricAssessment } from "@shared/schema";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MeasurementPoint {
  /** Identificador único da medida */
  id: string;
  /** Rótulo amigável exibido no label */
  label: string;
  /** Campo correspondente no objeto AnthropometricAssessment */
  field: keyof AnthropometricAssessment;
  /** Unidade de medida */
  unit: string;
  /**
   * Posição do ponto de ancoragem sobre a imagem, em % (0-100).
   *
   * Coordenadas calibradas pixel a pixel sobre a imagem body-hologram.png
   * (1024×1536px) usando a imagem de mapeamento fornecida pelo usuário.
   * x=0 → borda esquerda, x=100 → borda direita
   * y=0 → topo, y=100 → base
   */
  anchor: { x: number; y: number };
  /**
   * Lado preferencial do label.
   * "left"  → label aparece à esquerda do corpo
   * "right" → label aparece à direita do corpo
   */
  side: "left" | "right";
  /** Prioridade de exibição (menor = mais importante) */
  priority: number;
}

// ─── Mapa de pontos anatômicos ────────────────────────────────────────────────
//
// Coordenadas extraídas pixel a pixel da imagem de mapeamento do usuário
// (1000431922.png, 1024×1536px). Cada ponto corresponde à ponta interna
// da seta azul, ou seja, onde ela toca o corpo na imagem.
//
// Verificado visualmente com imagem de debug (debug_manual.png).

export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  {
    id: "neck",
    label: "Pescoço",
    field: "circumNeck",
    unit: "cm",
    anchor: { x: 49.8, y: 21.2 }, // ponta da seta direita tocando o pescoço
    side: "right",
    priority: 1,
  },
  {
    id: "arm_contracted",
    label: "Braço Contraído",
    field: "circumNonDominantArmContracted",
    unit: "cm",
    anchor: { x: 36.1, y: 27.0 }, // ponta da seta esquerda no braço superior
    side: "left",
    priority: 2,
  },
  {
    id: "chest",
    label: "Tórax",
    field: "circumChest",
    unit: "cm",
    anchor: { x: 54.7, y: 32.6 }, // ponta da seta direita no peitoral
    side: "right",
    priority: 3,
  },
  {
    id: "arm_relaxed",
    label: "Braço Relaxado",
    field: "circumNonDominantArmRelaxed",
    unit: "cm",
    anchor: { x: 35.6, y: 37.1 }, // ponta da seta esquerda no braço médio
    side: "left",
    priority: 4,
  },
  {
    id: "abdomen",
    label: "Abdômen",
    field: "circumAbdomen",
    unit: "cm",
    anchor: { x: 54.7, y: 45.6 }, // ponta da seta direita no abdômen
    side: "right",
    priority: 5,
  },
  {
    id: "waist",
    label: "Cintura",
    field: "circumWaist",
    unit: "cm",
    anchor: { x: 40.5, y: 46.9 }, // ponta da seta esquerda na cintura
    side: "left",
    priority: 6,
  },
  {
    id: "hip",
    label: "Quadril",
    field: "circumHip",
    unit: "cm",
    anchor: { x: 55.7, y: 53.4 }, // ponta da seta direita no quadril
    side: "right",
    priority: 7,
  },
  {
    id: "thigh",
    label: "Coxa Proximal",
    field: "circumNonDominantProximalThigh",
    unit: "cm",
    anchor: { x: 39.1, y: 56.6 }, // ponta da seta esquerda na coxa proximal
    side: "left",
    priority: 8,
  },
  {
    id: "calf",
    label: "Panturrilha",
    field: "circumNonDominantCalf",
    unit: "cm",
    anchor: { x: 38.1, y: 68.4 }, // ponta da seta esquerda na panturrilha
    side: "left",
    priority: 9,
  },
];

// ─── Helper: filtra apenas pontos com valor presente ─────────────────────────

export function getActivePoints(
  assessment: AnthropometricAssessment
): Array<MeasurementPoint & { value: number }> {
  return MEASUREMENT_POINTS.flatMap((point) => {
    const raw = assessment[point.field];
    if (raw == null || raw === undefined) return [];
    const num = typeof raw === "string" ? parseFloat(raw) : Number(raw);
    if (isNaN(num)) return [];
    return [{ ...point, value: num }];
  }).sort((a, b) => a.priority - b.priority);
}
