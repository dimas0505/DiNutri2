/**
 * Cálculo do Percentual de Gordura Corporal pela Equação de Durnin & Womersley (1974)
 * com conversão de densidade parametrizável (Siri 1961 ou Brozek 1963)
 *
 * Referências:
 *   Durnin, J.V.G.A. & Womersley, J. (1974). Body fat assessed from total body density
 *   and its estimation from skinfold thickness: measurements on 481 men and women aged
 *   from 16 to 72 years. British Journal of Nutrition, 32(1), 77–97.
 *
 *   Siri, W.E. (1961). Body composition from fluid spaces and density: Analysis of methods.
 *   In Techniques for Measuring Body Composition (pp. 223–244). National Academy of Sciences.
 *
 *   Brozek, J., Grande, F., Anderson, J.T., & Keys, A. (1963). Densitometric analysis
 *   of body composition: Revision of some quantitative assumptions. Annals of the New
 *   York Academy of Sciences, 110, 113–140.
 *
 * Método:
 *   1. Soma das 4 dobras cutâneas: tríceps + bíceps + subescapular + suprailíaca (mm)
 *   2. Densidade corporal (D) calculada a partir do log₁₀ da soma, usando coeficientes
 *      específicos por sexo e faixa etária (Durnin & Womersley, 1974).
 *   3. Percentual de gordura (%GC) calculado pela equação selecionada:
 *      - Siri (1961): %GC = (4,95 / D − 4,50) × 100
 *      - Brozek (1963): %GC = (4,57 / D − 4,142) × 100
 *
 * Faixas etárias suportadas: 16–72 anos
 */

/** Tipo de equação para conversão de densidade em %GC */
export type BodyFatEquation = "siri" | "brozek";

/** Coeficientes da equação de Durnin & Womersley por sexo e faixa etária */
interface DurninCoefficients {
  c: number; // constante
  m: number; // coeficiente do log₁₀(soma)
}

/**
 * Tabela de coeficientes para homens (M)
 * D = c - m × log₁₀(soma das 4 dobras)
 */
const MALE_COEFFICIENTS: Array<{ minAge: number; maxAge: number } & DurninCoefficients> = [
  { minAge: 0, maxAge: 16, c: 1.1533, m: 0.0643 }, // < 17 anos
  { minAge: 17, maxAge: 19, c: 1.1620, m: 0.0630 },
  { minAge: 20, maxAge: 29, c: 1.1631, m: 0.0632 },
  { minAge: 30, maxAge: 39, c: 1.1422, m: 0.0544 },
  { minAge: 40, maxAge: 49, c: 1.1620, m: 0.0700 },
  { minAge: 50, maxAge: 120, c: 1.1715, m: 0.0779 }, // > 50 anos
];

/**
 * Tabela de coeficientes para mulheres (F)
 * D = c - m × log₁₀(soma das 4 dobras)
 */
const FEMALE_COEFFICIENTS: Array<{ minAge: number; maxAge: number } & DurninCoefficients> = [
  { minAge: 0, maxAge: 16, c: 1.1369, m: 0.0598 }, // < 17 anos
  { minAge: 17, maxAge: 19, c: 1.1549, m: 0.0678 },
  { minAge: 20, maxAge: 29, c: 1.1599, m: 0.0717 },
  { minAge: 30, maxAge: 39, c: 1.1423, m: 0.0632 },
  { minAge: 40, maxAge: 49, c: 1.1333, m: 0.0612 },
  { minAge: 50, maxAge: 120, c: 1.1339, m: 0.0645 }, // > 50 anos
];

export interface DurninResult {
  /** Soma das 4 dobras cutâneas (mm) */
  sumFolds: number;
  /** Densidade corporal calculada (g/cm³ ou Kg/L) */
  density: number;
  /** Percentual de gordura corporal (%) */
  bodyFatPercent: number;
  /** Classificação do percentual de gordura */
  classification: string;
  /** Cor da classificação para exibição */
  classificationColor: string;
  /** Equação utilizada para conversão */
  equation: BodyFatEquation;
}

/**
 * Classifica o percentual de gordura corporal conforme referências da literatura
 * (Gallagher et al., 2000 — adaptado para uso clínico)
 */
export function classifyBodyFat(
  bodyFatPercent: number,
  sex: "M" | "F" | "Outro",
  age: number
): { label: string; color: string } {
  if (sex === "M") {
    if (bodyFatPercent < 6) return { label: "Abaixo do essencial", color: "text-blue-600" };
    if (bodyFatPercent < 14) return { label: "Atlético", color: "text-green-600" };
    if (bodyFatPercent < 18) return { label: "Boa forma", color: "text-emerald-600" };
    if (bodyFatPercent < 25) return { label: "Aceitável", color: "text-yellow-600" };
    return { label: "Obesidade", color: "text-red-600" };
  } else {
    // Feminino ou Outro (usa referência feminina como padrão)
    if (bodyFatPercent < 14) return { label: "Abaixo do essencial", color: "text-blue-600" };
    if (bodyFatPercent < 21) return { label: "Atlético", color: "text-green-600" };
    if (bodyFatPercent < 25) return { label: "Boa forma", color: "text-emerald-600" };
    if (bodyFatPercent < 32) return { label: "Aceitável", color: "text-yellow-600" };
    return { label: "Obesidade", color: "text-red-600" };
  }
}

/**
 * Calcula a densidade corporal pela equação de Durnin & Womersley (1974)
 *
 * @param triceps    Dobra tricipital (mm)
 * @param biceps     Dobra bicipital (mm)
 * @param subscapular Dobra subescapular (mm)
 * @param suprailiac  Dobra suprailíaca (mm)
 * @param sex        Sexo biológico: "M" (masculino) | "F" (feminino) | "Outro"
 * @param age        Idade em anos
 * @returns          Densidade corporal ou null se dados inválidos
 */
export function calculateDensity(
  triceps: number | null | undefined,
  biceps: number | null | undefined,
  subscapular: number | null | undefined,
  suprailiac: number | null | undefined,
  sex: "M" | "F" | "Outro" | null | undefined,
  age: number | null | undefined
): number | null {
  // Validação dos dados de entrada
  if (
    triceps == null || biceps == null || subscapular == null || suprailiac == null ||
    isNaN(triceps) || isNaN(biceps) || isNaN(subscapular) || isNaN(suprailiac) ||
    triceps <= 0 || biceps <= 0 || subscapular <= 0 || suprailiac <= 0
  ) {
    return null;
  }

  if (!sex || age == null || isNaN(age) || age < 10) {
    return null;
  }

  const sumFolds = triceps + biceps + subscapular + suprailiac;

  if (sumFolds <= 0) return null;

  // Selecionar tabela de coeficientes por sexo
  const table = sex === "M" ? MALE_COEFFICIENTS : FEMALE_COEFFICIENTS;

  // Encontrar coeficientes para a faixa etária
  const coeffs = table.find((row) => age >= row.minAge && age <= row.maxAge);
  if (!coeffs) return null;

  // Calcular densidade corporal: D = c - m × log₁₀(soma)
  const logSum = Math.log10(sumFolds);
  const density = coeffs.c - coeffs.m * logSum;

  return density;
}

/**
 * Converte densidade corporal em percentual de gordura usando a equação selecionada
 *
 * @param density  Densidade corporal (g/cm³)
 * @param equation Equação a usar: "siri" ou "brozek"
 * @returns        Percentual de gordura corporal (%) ou null se inválido
 */
export function convertDensityToBodyFat(
  density: number | null | undefined,
  equation: BodyFatEquation = "siri"
): number | null {
  if (density == null || isNaN(density) || density <= 0.9 || density >= 1.1) {
    return null;
  }

  let bodyFatPercent: number;

  if (equation === "brozek") {
    // Brozek (1963): %GC = (4,57 / D − 4,142) × 100
    bodyFatPercent = ((4.57 / density) - 4.142) * 100;
  } else {
    // Siri (1961): %GC = (4,95 / D − 4,50) × 100
    bodyFatPercent = ((4.95 / density) - 4.50) * 100;
  }

  if (bodyFatPercent < 0 || bodyFatPercent > 70) return null;

  return bodyFatPercent;
}

/**
 * Calcula o percentual de gordura corporal pela equação de Durnin & Womersley (1974)
 * com conversão parametrizável
 *
 * @param triceps    Dobra tricipital (mm)
 * @param biceps     Dobra bicipital (mm)
 * @param subscapular Dobra subescapular (mm)
 * @param suprailiac  Dobra suprailíaca (mm)
 * @param sex        Sexo biológico: "M" (masculino) | "F" (feminino) | "Outro"
 * @param age        Idade em anos
 * @param equation   Equação para conversão: "siri" (padrão) ou "brozek"
 * @returns          Resultado com %GC, densidade e classificação, ou null se dados inválidos
 */
export function calculateDurninBodyFat(
  triceps: number | null | undefined,
  biceps: number | null | undefined,
  subscapular: number | null | undefined,
  suprailiac: number | null | undefined,
  sex: "M" | "F" | "Outro" | null | undefined,
  age: number | null | undefined,
  equation: BodyFatEquation = "siri"
): DurninResult | null {
  // Calcular densidade
  const density = calculateDensity(triceps, biceps, subscapular, suprailiac, sex, age);
  if (density == null) return null;

  // Converter densidade em %GC
  const bodyFatPercent = convertDensityToBodyFat(density, equation);
  if (bodyFatPercent == null) return null;

  const sumFolds = (triceps ?? 0) + (biceps ?? 0) + (subscapular ?? 0) + (suprailiac ?? 0);
  const { label, color } = classifyBodyFat(bodyFatPercent, sex, age);

  return {
    sumFolds: Math.round(sumFolds * 10) / 10,
    density: Math.round(density * 1000) / 1000, // 3 casas decimais (Kg/L)
    bodyFatPercent: Math.round(bodyFatPercent * 10) / 10,
    classification: label,
    classificationColor: color,
    equation,
  };
}

/**
 * Calcula a idade a partir da data de nascimento
 */
export function calculateAgeFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}
