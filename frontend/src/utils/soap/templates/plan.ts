import type { ChronicState, PatientContext } from "../types"
import { calcEGFR } from "../egfr"
import { classifyHTNRisk } from "../htn-risk"
import { classifyASCVD, isAgeRisk } from "../ascvd"

function num(s: string): number | null {
  if (!s || s.trim() === "") return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function nonEmpty(s: string | undefined | null): boolean {
  return !!s && s.trim().length > 0
}

function htnPlan(state: ChronicState, patient: PatientContext): string[] {
  if (!state.selectedDiseases.includes("HTN")) return []
  const sbp = num(state.vitals.sbp)
  const dbp = num(state.vitals.dbp)
  const rfCount =
    (isAgeRisk(patient.age, patient.sex) ? 1 : 0) +
    (state.htn.has_smoking ? 1 : 0) +
    (state.htn.has_family_history ? 1 : 0)
  const res = classifyHTNRisk({
    sbp,
    dbp,
    hasDM: state.selectedDiseases.includes("DM"),
    hasCKD: state.selectedDiseases.includes("CKD"),
    hasCardiovascular: state.htn.has_cardiovascular,
    riskFactorCount: rfCount,
  })
  return [`${res.riskGroup} — BP 목표 ${res.bpTarget}.`]
}

function dmPlan(state: ChronicState): string[] {
  if (!state.selectedDiseases.includes("DM")) return []
  return ["혈당/HbA1c 추이 확인."]
}

function dlPlan(state: ChronicState, patient: PatientContext): string[] {
  if (!state.selectedDiseases.includes("DL")) return []
  const hdlLow = num(state.labs.hdl) !== null && (num(state.labs.hdl) as number) < 40
  const rfCount =
    (isAgeRisk(patient.age, patient.sex) ? 1 : 0) +
    (state.dl.rf_htn ? 1 : 0) +
    (hdlLow ? 1 : 0) +
    (state.dl.rf_smoking ? 1 : 0) +
    (state.dl.rf_family_history ? 1 : 0)
  const ascvd = classifyASCVD({
    isVeryHighRisk: state.dl.has_ascvd_history,
    hasDM: state.selectedDiseases.includes("DM"),
    riskFactorCount: rfCount,
  })
  return [`${ascvd.grade}, LDL 목표 ${ascvd.ldlTarget}.`]
}

function ckdPlan(state: ChronicState, patient: PatientContext): string[] {
  if (!state.selectedDiseases.includes("CKD")) return []
  const egfr = calcEGFR(num(state.labs.cr), patient.age, patient.sex)
  const stageSuffix = egfr !== null ? `, eGFR ${egfr}` : ""
  const lines = [`신기능/단백뇨 추이 확인${stageSuffix}.`]
  if (state.ckd.is_dialysis) lines.push("투석 관련 경과 추적.")
  return lines
}

function obPlan(state: ChronicState): string[] {
  if (!state.selectedDiseases.includes("OB")) return []
  const goal = nonEmpty(state.ob.goal_weight) ? ` (목표 ${state.ob.goal_weight}kg)` : ""
  return [`체중 감량 권고${goal}. 식이·운동 상담.`]
}

function masldPlan(state: ChronicState): string[] {
  if (!state.selectedDiseases.includes("MASLD")) return []
  return ["체중 감량·금주·운동 권고, 간효소치 추이 모니터링."]
}

function opPlan(state: ChronicState): string[] {
  if (!state.selectedDiseases.includes("OP")) return []
  const ca = state.op.calcium_intake_adequate
    ? "칼슘 섭취 적정."
    : "칼슘 섭취 부족 → 보충 권고."
  return [`${ca} 비타민D 확인, 골절 위험 평가.`]
}

function thyroidPlan(state: ChronicState): string[] {
  const lines: string[] = []
  if (state.selectedDiseases.includes("HypoT")) {
    lines.push("TSH 추이 확인.")
  }
  if (state.selectedDiseases.includes("HyperT")) {
    lines.push("TSH/fT4 추이 확인.")
  }
  return lines
}

function educationLine(state: ChronicState): string | null {
  const e = state.education
  const items: string[] = []
  if (e.chronic_mgmt) items.push("만성질환 관리 교육함")
  if (e.diet) items.push("식이요법 교육함")
  if (e.exercise) items.push("운동요법 교육함")
  if (e.smoking_cessation) items.push("금연 교육함")
  if (e.alcohol_reduction) items.push("금주 교육함")
  if (e.regular_checkup) items.push("정기적 검사 안내함")
  if (nonEmpty(e.extra)) items.push(e.extra.trim())
  return items.length ? items.join(". ") + "." : null
}

export function generatePlan(state: ChronicState, patient: PatientContext): string {
  const lines: string[] = []
  lines.push(...htnPlan(state, patient))
  lines.push(...dmPlan(state))
  lines.push(...dlPlan(state, patient))
  lines.push(...ckdPlan(state, patient))
  lines.push(...obPlan(state))
  lines.push(...masldPlan(state))
  lines.push(...opPlan(state))
  lines.push(...thyroidPlan(state))
  const edu = educationLine(state)
  if (edu) lines.push(edu)
  if (nonEmpty(state.extraPlan)) lines.push(state.extraPlan.trim())
  return lines.join("\n")
}
