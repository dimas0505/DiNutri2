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
   * Calibrado para a imagem body-hologram.png (proporção 3:4 aprox).
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
// Coordenadas calibradas visualmente sobre a imagem body-hologram.png
// A imagem tem o corpo centralizado horizontalmente, ocupando ~40% da largura.
// O topo da cabeça começa em ~8% Y, os pés terminam em ~93% Y.

export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  {
    id: "neck",
    label: "Pescoço",
    field: "circumNeck",
    unit: "cm",
    anchor: { x: 50, y: 17 },
    side: "right",
    priority: 1,
  },
  {
    id: "chest",
    label: "Tórax",
    field: "circumChest",
    unit: "cm",
    anchor: { x: 50, y: 30 },
    side: "left",
    priority: 2,
  },
  {
    id: "waist",
    label: "Cintura",
    field: "circumWaist",
    unit: "cm",
    anchor: { x: 50, y: 42 },
    side: "right",
    priority: 3,
  },
  {
    id: "abdomen",
    label: "Abdômen",
    field: "circumAbdomen",
    unit: "cm",
    anchor: { x: 50, y: 48 },
    side: "left",
    priority: 4,
  },
  {
    id: "hip",
    label: "Quadril",
    field: "circumHip",
    unit: "cm",
    anchor: { x: 50, y: 56 },
    side: "right",
    priority: 5,
  },
  {
    id: "arm",
    label: "Braço",
    field: "circumNonDominantArmRelaxed",
    unit: "cm",
    anchor: { x: 33, y: 35 },
    side: "left",
    priority: 6,
  },
  {
    id: "thigh",
    label: "Coxa",
    field: "circumNonDominantProximalThigh",
    unit: "cm",
    anchor: { x: 43, y: 67 },
    side: "left",
    priority: 7,
  },
  {
    id: "calf",
    label: "Panturrilha",
    field: "circumNonDominantCalf",
    unit: "cm",
    anchor: { x: 43, y: 82 },
    side: "right",
    priority: 8,
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
