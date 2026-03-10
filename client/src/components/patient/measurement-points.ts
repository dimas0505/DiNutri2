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
   * Posição do ponto de ancoragem em % RELATIVO À IMAGEM (não ao container).
   *
   * A imagem body-hologram.png tem 1024×1536px (proporção 2:3).
   * x=0 → borda esquerda da imagem, x=100 → borda direita da imagem
   * y=0 → topo da imagem, y=100 → base da imagem
   *
   * O componente converte essas coordenadas para % do container
   * usando a função imgToContainer(), levando em conta o espaço
   * lateral que a imagem ocupa (IMG_WIDTH_FRACTION).
   *
   * Coordenadas calibradas pixel a pixel pelo usuário na imagem
   * de mapeamento (1000431922.png, 1024×1536px).
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
// Coordenadas em % relativas à imagem body-hologram.png (1024×1536px).
// Calibradas com base na imagem de mapeamento do usuário.
//
// Referência de pixels na imagem original:
//   Pescoço         → (510, 325)  = x=49.8%, y=21.2%
//   Braço Contraído → (370, 415)  = x=36.1%, y=27.0%
//   Tórax           → (560, 500)  = x=54.7%, y=32.6%
//   Braço Relaxado  → (365, 570)  = x=35.6%, y=37.1%
//   Abdômen         → (560, 700)  = x=54.7%, y=45.6%
//   Cintura         → (415, 720)  = x=40.5%, y=46.9%
//   Quadril         → (570, 820)  = x=55.7%, y=53.4%
//   Coxa Proximal   → (400, 870)  = x=39.1%, y=56.6%
//   Panturrilha     → (390, 1050) = x=38.1%, y=68.4%

export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  {
    id: "neck",
    label: "Pescoço",
    field: "circumNeck",
    unit: "cm",
    anchor: { x: 49.8, y: 21.2 },
    side: "right",
    priority: 1,
  },
  {
    id: "arm_contracted",
    label: "Braço Contraído",
    field: "circumNonDominantArmContracted",
    unit: "cm",
    anchor: { x: 36.1, y: 27.0 },
    side: "left",
    priority: 2,
  },
  {
    id: "chest",
    label: "Tórax",
    field: "circumChest",
    unit: "cm",
    anchor: { x: 54.7, y: 32.6 },
    side: "right",
    priority: 3,
  },
  {
    id: "arm_relaxed",
    label: "Braço Relaxado",
    field: "circumNonDominantArmRelaxed",
    unit: "cm",
    anchor: { x: 35.6, y: 37.1 },
    side: "left",
    priority: 4,
  },
  {
    id: "abdomen",
    label: "Abdômen",
    field: "circumAbdomen",
    unit: "cm",
    anchor: { x: 54.7, y: 45.6 },
    side: "right",
    priority: 5,
  },
  {
    id: "waist",
    label: "Cintura",
    field: "circumWaist",
    unit: "cm",
    anchor: { x: 40.5, y: 46.9 },
    side: "left",
    priority: 6,
  },
  {
    id: "hip",
    label: "Quadril",
    field: "circumHip",
    unit: "cm",
    anchor: { x: 55.7, y: 53.4 },
    side: "right",
    priority: 7,
  },
  {
    id: "thigh",
    label: "Coxa Proximal",
    field: "circumNonDominantProximalThigh",
    unit: "cm",
    anchor: { x: 39.1, y: 56.6 },
    side: "left",
    priority: 8,
  },
  {
    id: "calf",
    label: "Panturrilha",
    field: "circumNonDominantCalf",
    unit: "cm",
    anchor: { x: 38.1, y: 68.4 },
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
