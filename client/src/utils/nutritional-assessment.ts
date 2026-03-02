/**
 * Utilitário de Cálculos Nutricionais e Indicadores de Risco
 * Baseado em literatura científica confiável (OMS, Frisancho, etc.)
 */

// ─── IMC (Índice de Massa Corporal) ──────────────────────────────────────────

export interface IMCResult {
  imc: number;
  classification: string;
  classificationColor: string;
}

/**
 * Calcula o IMC e retorna a classificação conforme OMS
 * IMC = peso (kg) / altura² (m²)
 */
export function calculateIMC(weightKg: number | null, heightCm: number | null): IMCResult | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;

  const heightM = heightCm / 100;
  const imc = weightKg / (heightM * heightM);

  let classification = "";
  let classificationColor = "";

  if (imc < 18.5) {
    classification = "Baixo peso";
    classificationColor = "text-blue-600";
  } else if (imc >= 18.5 && imc < 25) {
    classification = "Eutrofia (Normal)";
    classificationColor = "text-green-600";
  } else if (imc >= 25 && imc < 30) {
    classification = "Sobrepeso";
    classificationColor = "text-yellow-600";
  } else if (imc >= 30 && imc < 35) {
    classification = "Obesidade Grau I";
    classificationColor = "text-orange-600";
  } else if (imc >= 35 && imc < 40) {
    classification = "Obesidade Grau II";
    classificationColor = "text-red-600";
  } else {
    classification = "Obesidade Grau III";
    classificationColor = "text-red-700";
  }

  return {
    imc: parseFloat(imc.toFixed(1)),
    classification,
    classificationColor,
  };
}

// ─── Faixa de Peso Ideal ──────────────────────────────────────────────────────

export interface IdealWeightRange {
  min: number;
  max: number;
}

/**
 * Calcula a faixa de peso ideal baseado em IMC 22 (ponto médio de eutrofia)
 * Peso ideal = 22 * altura² (m²)
 * Faixa: 20-24 (IMC normal)
 */
export function calculateIdealWeightRange(heightCm: number | null): IdealWeightRange | null {
  if (!heightCm || heightCm <= 0) return null;

  const heightM = heightCm / 100;
  const minWeight = 20 * (heightM * heightM);
  const maxWeight = 24 * (heightM * heightM);

  return {
    min: parseFloat(minWeight.toFixed(1)),
    max: parseFloat(maxWeight.toFixed(1)),
  };
}

// ─── RCQ (Relação Cintura/Quadril) ───────────────────────────────────────────

export interface RCQResult {
  rcq: number;
  riskClassification: string;
  riskColor: string;
}

/**
 * Calcula a RCQ e classifica o risco metabólico
 * RCQ = Cintura / Quadril
 * Classificação por sexo conforme literatura (WHO, Lean, 1998)
 */
export function calculateRCQ(
  circumWaistCm: number | null,
  circumHipCm: number | null,
  sex: "M" | "F" | "Outro" | null | undefined
): RCQResult | null {
  if (!circumWaistCm || !circumHipCm || !sex || circumWaistCm <= 0 || circumHipCm <= 0) return null;

  const rcq = circumWaistCm / circumHipCm;

  let riskClassification = "";
  let riskColor = "";

  if (sex === "M") {
    if (rcq < 0.85) {
      riskClassification = "Risco baixo";
      riskColor = "text-green-600";
    } else if (rcq >= 0.85 && rcq < 0.95) {
      riskClassification = "Risco moderado";
      riskColor = "text-yellow-600";
    } else {
      riskClassification = "Risco alto";
      riskColor = "text-red-600";
    }
  } else if (sex === "F") {
    if (rcq < 0.75) {
      riskClassification = "Risco baixo";
      riskColor = "text-green-600";
    } else if (rcq >= 0.75 && rcq < 0.85) {
      riskClassification = "Risco moderado";
      riskColor = "text-yellow-600";
    } else {
      riskClassification = "Risco alto";
      riskColor = "text-red-600";
    }
  } else {
    return null;
  }

  return {
    rcq: parseFloat(rcq.toFixed(2)),
    riskClassification,
    riskColor,
  };
}

// ─── CMB (Circunferência Muscular do Braço) ──────────────────────────────────

export interface CMBResult {
  cmb: number;
  percentile: number;
  classification: string;
  classificationColor: string;
}

/**
 * Calcula a CMB (Circunferência Muscular do Braço)
 * CMB = CB - (π * PT)
 * Onde: CB = Circunferência do Braço, PT = Prega Tricipital (mm)
 * Classificação por percentil de Frisancho (1981)
 */
export function calculateCMB(
  circumArmCm: number | null,
  foldTricepsMm: number | null,
  sex: "M" | "F" | "Outro" | null | undefined,
  ageYears: number | null
): CMBResult | null {
  if (!circumArmCm || !foldTricepsMm || !sex || !ageYears || circumArmCm <= 0 || foldTricepsMm <= 0) {
    return null;
  }

  // CMB = CB - (π * PT/10) [PT em mm, dividir por 10 para converter para cm]
  const cmb = circumArmCm - (Math.PI * (foldTricepsMm / 10));

  // Referências de Frisancho para adultos (simplificado)
  // Valores médios por sexo e idade
  let expectedCMB = 0;
  let p50 = 0; // Percentil 50 (mediana)

  if (sex === "M") {
    if (ageYears >= 18 && ageYears < 25) {
      p50 = 29.3;
    } else if (ageYears >= 25 && ageYears < 35) {
      p50 = 29.8;
    } else if (ageYears >= 35 && ageYears < 45) {
      p50 = 29.5;
    } else if (ageYears >= 45 && ageYears < 55) {
      p50 = 29.0;
    } else if (ageYears >= 55) {
      p50 = 28.5;
    }
  } else if (sex === "F") {
    if (ageYears >= 18 && ageYears < 25) {
      p50 = 23.5;
    } else if (ageYears >= 25 && ageYears < 35) {
      p50 = 23.8;
    } else if (ageYears >= 35 && ageYears < 45) {
      p50 = 23.5;
    } else if (ageYears >= 45 && ageYears < 55) {
      p50 = 23.0;
    } else if (ageYears >= 55) {
      p50 = 22.5;
    }
  } else {
    return null;
  }

  // Cálculo do percentil (simplificado)
  const percentile = (cmb / p50) * 100;

  let classification = "";
  let classificationColor = "";

  if (percentile >= 90) {
    classification = "Eutrófico";
    classificationColor = "text-green-600";
  } else if (percentile >= 75 && percentile < 90) {
    classification = "Eutrófico";
    classificationColor = "text-green-600";
  } else if (percentile >= 60 && percentile < 75) {
    classification = "Depleção leve";
    classificationColor = "text-yellow-600";
  } else if (percentile >= 50 && percentile < 60) {
    classification = "Depleção moderada";
    classificationColor = "text-orange-600";
  } else {
    classification = "Depleção severa";
    classificationColor = "text-red-600";
  }

  return {
    cmb: parseFloat(cmb.toFixed(1)),
    percentile: parseFloat(percentile.toFixed(1)),
    classification,
    classificationColor,
  };
}

// ─── Circunferência Abdominal (Risco Cardiovascular) ────────────────────────

export interface AbdominalCircumferenceRisk {
  circumAbdomen: number;
  riskClassification: string;
  riskColor: string;
}

/**
 * Classifica o risco cardiovascular baseado na circunferência abdominal
 * Conforme IDF (International Diabetes Federation) e OMS
 */
export function calculateAbdominalRisk(
  circumAbdomenCm: number | null,
  sex: "M" | "F" | "Outro" | null | undefined
): AbdominalCircumferenceRisk | null {
  if (!circumAbdomenCm || !sex || circumAbdomenCm <= 0) return null;

  let riskClassification = "";
  let riskColor = "";

  if (sex === "M") {
    if (circumAbdomenCm < 94) {
      riskClassification = "Risco baixo";
      riskColor = "text-green-600";
    } else if (circumAbdomenCm >= 94 && circumAbdomenCm < 102) {
      riskClassification = "Risco aumentado";
      riskColor = "text-yellow-600";
    } else {
      riskClassification = "Risco muito aumentado";
      riskColor = "text-red-600";
    }
  } else if (sex === "F") {
    if (circumAbdomenCm < 80) {
      riskClassification = "Risco baixo";
      riskColor = "text-green-600";
    } else if (circumAbdomenCm >= 80 && circumAbdomenCm < 88) {
      riskClassification = "Risco aumentado";
      riskColor = "text-yellow-600";
    } else {
      riskClassification = "Risco muito aumentado";
      riskColor = "text-red-600";
    }
  } else {
    return null;
  }

  return {
    circumAbdomen: circumAbdomenCm,
    riskClassification,
    riskColor,
  };
}
