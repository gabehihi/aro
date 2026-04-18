/**
 * 2022 대한고혈압학회 진료지침 — 심뇌혈관 위험군 분류 + 혈압 조절 목표
 */
export interface HTNRiskInput {
  sbp: number | null
  dbp: number | null
  hasDM: boolean
  hasCKD: boolean
  hasCardiovascular: boolean
  riskFactorCount: number
}

export interface HTNRiskResult {
  riskGroup: string
  bpTarget: string
  description: string
}

export function classifyHTNRisk({
  sbp,
  dbp,
  hasDM,
  hasCKD,
  hasCardiovascular,
  riskFactorCount,
}: HTNRiskInput): HTNRiskResult {
  const isStage2 = (sbp ?? 0) >= 160 || (dbp ?? 0) >= 100

  if (hasCardiovascular) {
    return {
      riskGroup: "초고위험군",
      bpTarget: "<130/80 mmHg",
      description: "심혈관질환 기왕력 (관상동맥질환, 뇌졸중, 심부전 등)",
    }
  }

  if (hasDM || hasCKD) {
    const desc = hasDM && hasCKD ? "당뇨 + CKD" : hasDM ? "당뇨 동반" : "CKD 동반"
    return { riskGroup: "고위험군", bpTarget: "<130/80 mmHg", description: desc }
  }

  if (riskFactorCount >= 3 || isStage2) {
    return {
      riskGroup: "고위험군",
      bpTarget: "<130/80 mmHg",
      description: `위험인자 ${riskFactorCount}개${isStage2 ? " / 2기 고혈압" : ""}`,
    }
  }

  if (riskFactorCount === 2) {
    return {
      riskGroup: "중등도위험군",
      bpTarget: "<140/90 mmHg",
      description: `위험인자 ${riskFactorCount}개`,
    }
  }

  return {
    riskGroup: "저위험군",
    bpTarget: "<140/90 mmHg",
    description: `위험인자 ${riskFactorCount}개`,
  }
}
