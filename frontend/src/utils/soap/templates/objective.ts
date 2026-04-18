import { calcBMI, bmiCategory } from "../bmi"
import { calcEGFR } from "../egfr"
import { getCKDStage } from "../ckd-stage"
import { classifyASCVD, isAgeRisk } from "../ascvd"
import type { ChronicState, PatientContext } from "../types"

function num(s: string): number | null {
  if (!s || s.trim() === "") return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function nonEmpty(s: string | undefined | null): boolean {
  return !!s && s.trim().length > 0
}

function vitalsLine(state: ChronicState): string | null {
  const { sbp, dbp, hr, bt } = state.vitals
  const parts: string[] = []
  if (nonEmpty(sbp) && nonEmpty(dbp)) {
    const hrPart = nonEmpty(hr) ? ` - ${hr}` : ""
    parts.push(`${sbp}/${dbp}${hrPart}`)
  }
  if (nonEmpty(bt)) parts.push(`${bt}℃`)
  return parts.length ? `V/S : ${parts.join(", ")}` : null
}

function anthroLine(state: ChronicState): string | null {
  const bw = num(state.vitals.bw)
  const bh = num(state.vitals.bh)
  const waist = num(state.vitals.waist)
  if (bw === null && bh === null && waist === null) return null
  const bmi = calcBMI(bw, bh)
  const parts: string[] = []
  if (bh !== null) parts.push(`키 ${bh}cm`)
  if (bw !== null) parts.push(`체중 ${bw}kg`)
  if (waist !== null) parts.push(`허리둘레 ${waist}cm`)
  if (bmi !== null) {
    const cat = bmiCategory(bmi)
    parts.push(`BMI ${bmi} kg/m²${cat ? ` (${cat})` : ""}`)
  }
  return parts.join(" ")
}

function lipidLine(state: ChronicState, patient: PatientContext): string | null {
  if (!state.selectedDiseases.includes("DL")) return null
  const { tc, tg, hdl, ldl } = state.labs
  const vals: string[] = []
  if (nonEmpty(tc)) vals.push(`TC ${tc}`)
  if (nonEmpty(tg)) vals.push(`TG ${tg}`)
  if (nonEmpty(hdl)) vals.push(`HDL ${hdl}`)
  if (nonEmpty(ldl)) vals.push(`LDL ${ldl}`)
  if (vals.length === 0) return null

  const ageAuto = isAgeRisk(patient.age, patient.sex)
  const hdlLow = num(hdl) !== null && (num(hdl) as number) < 40
  const rfCount =
    (ageAuto ? 1 : 0) +
    (state.dl.rf_htn ? 1 : 0) +
    (hdlLow ? 1 : 0) +
    (state.dl.rf_smoking ? 1 : 0) +
    (state.dl.rf_family_history ? 1 : 0)

  const ascvd = classifyASCVD({
    isVeryHighRisk: state.dl.has_ascvd_history,
    hasDM: state.selectedDiseases.includes("DM"),
    riskFactorCount: rfCount,
  })
  const dateSuffix = nonEmpty(state.dl.labs_date) ? ` (${state.dl.labs_date})` : ""
  return `${vals.join(" / ")} mg/dL${dateSuffix} — ASCVD risk: ${ascvd.grade} (LDL 목표 ${ascvd.ldlTarget})`
}

function renalLine(state: ChronicState, patient: PatientContext): string | null {
  if (!state.selectedDiseases.includes("CKD")) return null
  const cr = num(state.labs.cr)
  const bun = num(state.labs.bun)
  const acr = num(state.labs.acr)
  if (cr === null && bun === null && acr === null) return null
  const egfr = calcEGFR(cr, patient.age, patient.sex)
  const stage = getCKDStage(egfr)
  const parts: string[] = []
  if (egfr !== null) {
    parts.push(`eGFR ${egfr} mL/min/1.73m²${stage ? ` (${stage.label})` : ""}`)
  }
  const sub: string[] = []
  if (bun !== null) sub.push(`BUN ${bun}`)
  if (cr !== null) sub.push(`Cr ${cr}`)
  if (sub.length) parts.push(`(${sub.join(" / ")} mg/dL)`)
  if (acr !== null) parts.push(`ACR ${acr} mg/g`)
  return parts.join(" ")
}

function dmLabLine(state: ChronicState): string | null {
  if (!state.selectedDiseases.includes("DM")) return null
  const parts: string[] = []
  if (nonEmpty(state.labs.hba1c)) parts.push(`HbA1c ${state.labs.hba1c}%`)
  if (nonEmpty(state.labs.fbs)) parts.push(`FBS ${state.labs.fbs}`)
  if (nonEmpty(state.labs.ppg)) parts.push(`PPG ${state.labs.ppg}`)
  if (!parts.length) return null
  const dateSuffix = nonEmpty(state.dm.labs_date) ? ` (${state.dm.labs_date})` : ""
  return `${parts.join(" / ")}${dateSuffix}`
}

function hepaticLine(state: ChronicState): string | null {
  if (!state.selectedDiseases.includes("MASLD")) return null
  const parts: string[] = []
  if (nonEmpty(state.labs.ast)) parts.push(`AST ${state.labs.ast}`)
  if (nonEmpty(state.labs.alt)) parts.push(`ALT ${state.labs.alt}`)
  if (nonEmpty(state.labs.ggt)) parts.push(`γGT ${state.labs.ggt}`)
  if (!parts.length) return null
  const fib = nonEmpty(state.masld.fib4) ? ` / FIB-4 ${state.masld.fib4}` : ""
  return `${parts.join(" / ")} U/L${fib}`
}

function thyroidLine(state: ChronicState): string | null {
  const hasThyroid =
    state.selectedDiseases.includes("HypoT") || state.selectedDiseases.includes("HyperT")
  if (!hasThyroid) return null
  const parts: string[] = []
  if (nonEmpty(state.labs.tsh)) parts.push(`TSH ${state.labs.tsh}`)
  if (nonEmpty(state.labs.ft4)) parts.push(`fT4 ${state.labs.ft4}`)
  return parts.length ? parts.join(" / ") : null
}

function opLine(state: ChronicState): string | null {
  if (!state.selectedDiseases.includes("OP")) return null
  const parts: string[] = []
  if (nonEmpty(state.labs.tscore_spine)) parts.push(`Spine T-score ${state.labs.tscore_spine}`)
  if (nonEmpty(state.labs.tscore_hip)) parts.push(`Hip T-score ${state.labs.tscore_hip}`)
  if (!parts.length) return null
  const date = nonEmpty(state.op.last_dexa_date) ? ` (${state.op.last_dexa_date})` : ""
  return `${parts.join(" / ")}${date}`
}

function supplementalLine(state: ChronicState): string | null {
  const parts: string[] = []
  if (nonEmpty(state.labs.vitd)) parts.push(`Vit D ${state.labs.vitd} ng/mL`)
  if (nonEmpty(state.labs.hb)) parts.push(`Hb ${state.labs.hb} g/dL`)
  for (const lab of state.otherLabs) {
    if (!nonEmpty(lab.name) || !nonEmpty(lab.value)) continue
    const unit = nonEmpty(lab.unit) ? ` ${lab.unit.trim()}` : ""
    parts.push(`${lab.name.trim()} ${lab.value.trim()}${unit}`)
  }
  return parts.length ? parts.join(" / ") : null
}

export function generateObjective(state: ChronicState, patient: PatientContext): string {
  const lines: (string | null)[] = [
    vitalsLine(state),
    anthroLine(state),
    dmLabLine(state),
    lipidLine(state, patient),
    renalLine(state, patient),
    hepaticLine(state),
    thyroidLine(state),
    opLine(state),
    supplementalLine(state),
  ]
  return lines.filter((l): l is string => !!l).join("\n")
}
