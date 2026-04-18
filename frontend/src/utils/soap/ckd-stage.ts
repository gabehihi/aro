export type CKDStage = "G1" | "G2" | "G3a" | "G3b" | "G4" | "G5"

export interface CKDStageInfo {
  stage: CKDStage
  label: string
}

/**
 * KDIGO 2024 eGFR → CKD stage
 */
export function getCKDStage(egfr: number | null | undefined): CKDStageInfo | null {
  if (egfr === null || egfr === undefined || Number.isNaN(egfr)) return null
  if (egfr >= 90) return { stage: "G1", label: "CKD stage I" }
  if (egfr >= 60) return { stage: "G2", label: "CKD stage II" }
  if (egfr >= 45) return { stage: "G3a", label: "CKD stage IIIa" }
  if (egfr >= 30) return { stage: "G3b", label: "CKD stage IIIb" }
  if (egfr >= 15) return { stage: "G4", label: "CKD stage IV" }
  return { stage: "G5", label: "CKD stage V" }
}
