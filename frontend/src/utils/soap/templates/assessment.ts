import type { ChronicState } from "../types"
import { DISEASES, DISEASE_ORDER } from "../diseases"
import { calcEGFR } from "../egfr"
import { getCKDStage } from "../ckd-stage"
import type { PatientContext } from "../types"

const ASSESSMENT_LABELS: Record<Exclude<keyof typeof DISEASES, "CKD">, string> = {
  HTN: "HTN",
  DM: "DM",
  DL: "DysL",
  OB: "Obesity",
  MASLD: "MASLD",
  OP: "Osteoporosis",
  HypoT: "Hypothyroidism",
  HyperT: "Hyperthyroidism",
}

function num(s: string): number | null {
  if (!s || s.trim() === "") return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function formatCKDAssessment(state: ChronicState, patient: PatientContext): string {
  const egfr = calcEGFR(num(state.labs.cr), patient.age, patient.sex)
  const stage = getCKDStage(egfr)

  if (!stage) return `# ${DISEASES.CKD.shortLabel}`

  const details: string[] = []
  if (egfr !== null) details.push(`eGFR ${egfr} mL/min/1.73m²`)
  if (state.ckd.labs_date.trim()) details.push(state.ckd.labs_date.trim())

  return details.length
    ? `# ${stage.label} (${details.join(", ")})`
    : `# ${stage.label}`
}

export function generateAssessment(state: ChronicState, patient: PatientContext): string {
  const lines: string[] = []

  for (const id of DISEASE_ORDER) {
    if (!state.selectedDiseases.includes(id)) continue
    if (id === "CKD") {
      lines.push(formatCKDAssessment(state, patient))
    } else {
      lines.push(`# ${ASSESSMENT_LABELS[id]}`)
    }
  }

  for (const dx of state.extraDiagnoses) {
    const trimmed = dx.trim()
    if (trimmed) lines.push(`# ${trimmed}`)
  }

  return lines.join("\n")
}

/**
 * 저장 payload용: 선택된 질환들의 canonical KCD 코드 목록
 */
export function getKCDCodesForSave(
  state: ChronicState,
): { code: string; description: string }[] {
  return state.selectedDiseases.map((id) => ({
    code: DISEASES[id].kcdCode,
    description: DISEASES[id].kcdDescription,
  }))
}
