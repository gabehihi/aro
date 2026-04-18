/**
 * ASCVD 위험도 분류
 * 한국지질·동맥경화학회 이상지질혈증 진료지침 제5판 (2022)
 */
export interface ASCVDInput {
  isVeryHighRisk: boolean
  hasDM: boolean
  riskFactorCount: number
}

export interface ASCVDResult {
  grade: string
  color: "red" | "orange" | "yellow" | "green"
  ldlTarget: string
}

export function classifyASCVD({
  isVeryHighRisk,
  hasDM,
  riskFactorCount,
}: ASCVDInput): ASCVDResult {
  if (isVeryHighRisk)
    return { grade: "초고위험군", color: "red", ldlTarget: "<55 mg/dL" }
  if (hasDM || riskFactorCount >= 3)
    return { grade: "고위험군", color: "orange", ldlTarget: "<70 mg/dL" }
  if (riskFactorCount === 2)
    return { grade: "중등도위험군", color: "yellow", ldlTarget: "<100 mg/dL" }
  return { grade: "저위험군", color: "green", ldlTarget: "<130 mg/dL" }
}

/**
 * 나이 위험인자 자동 판정: 남 ≥ 45, 여 ≥ 55
 */
export function isAgeRisk(age: number | null, sex: "M" | "F" | null): boolean {
  if (!age || !sex) return false
  if (sex === "M") return age >= 45
  return age >= 55
}
