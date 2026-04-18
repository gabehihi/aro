/**
 * KDIGO 2024 CKD Guideline Rec. 3.15.1 — Statin 권고
 */
export interface KDIGOStatinInput {
  age: number | null
  egfr: number | null
  hasDM: boolean
  isVeryHighRisk: boolean
  isDialysis: boolean
}

export interface KDIGOStatinResult {
  recommendation: string
  level: "strong" | "moderate" | "neutral" | "gray"
}

export function getKDIGOStatin({
  age,
  egfr,
  hasDM,
  isVeryHighRisk,
  isDialysis,
}: KDIGOStatinInput): KDIGOStatinResult | null {
  if (!age || egfr === null) return null

  if (isDialysis) {
    return {
      recommendation: "투석 중: 새로 시작 비권고 (복용 중이면 유지)",
      level: "gray",
    }
  }

  if (age >= 50) {
    if (egfr < 60) {
      return {
        recommendation: "Statin 또는 Statin/Ezetimibe 권고 (≥50세, eGFR<60)",
        level: "strong",
      }
    }
    return {
      recommendation: "Statin 권고 (≥50세, eGFR≥60)",
      level: "moderate",
    }
  }

  if (hasDM || isVeryHighRisk) {
    return {
      recommendation: "Statin 권고 (18~49세, 고위험)",
      level: "moderate",
    }
  }

  return {
    recommendation: "개별 판단 필요 (18~49세, CKD)",
    level: "neutral",
  }
}
