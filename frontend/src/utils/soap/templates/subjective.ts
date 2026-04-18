import type { ChronicState } from "../types"

function nonEmpty(s: string | undefined | null): boolean {
  return !!s && s.trim().length > 0
}

function htnS(state: ChronicState): string[] {
  if (!state.selectedDiseases.includes("HTN")) return []
  const lines: string[] = []
  const { home_bp_measured, home_sbp, home_dbp, has_orthostatic, orthostatic_detail } = state.htn
  if (home_bp_measured) {
    const bp = nonEmpty(home_sbp) && nonEmpty(home_dbp) ? ` ${home_sbp}/${home_dbp}` : ""
    lines.push(`가정혈압 측정함.${bp}.`.replace(" .", "."))
  } else {
    lines.push("가정혈압 측정하지 않음.")
  }
  if (has_orthostatic) {
    const detail = nonEmpty(orthostatic_detail) ? ` — ${orthostatic_detail.trim()}` : ""
    lines.push(`기립성 저혈압 증상 있음${detail}.`)
  } else {
    lines.push("기립성 저혈압 증상 없음.")
  }
  return lines
}

function dmS(state: ChronicState): string[] {
  if (!state.selectedDiseases.includes("DM")) return []
  const lines: string[] = []
  const { home_glucose_measured, home_fbs, home_ppg, has_hypo, hypo_detail } = state.dm
  if (home_glucose_measured) {
    const fbs = nonEmpty(home_fbs) ? `FBS ${home_fbs}` : ""
    const ppg = nonEmpty(home_ppg) ? `PPG ${home_ppg}` : ""
    const values = [fbs, ppg].filter(Boolean).join(" / ")
    lines.push(`가정혈당 측정함.${values ? " " + values + "." : ""}`)
  } else {
    lines.push("가정혈당 측정하지 않음.")
  }
  if (has_hypo) {
    const detail = nonEmpty(hypo_detail) ? ` — ${hypo_detail.trim()}` : ""
    lines.push(`저혈당 증상 있음${detail}.`)
  } else {
    lines.push("저혈당 증상 없음.")
  }
  if (state.dm.insulin_used) {
    const parts: string[] = []
    if (nonEmpty(state.dm.insulin_basal)) {
      const name = nonEmpty(state.dm.insulin_basal_name)
        ? `${state.dm.insulin_basal_name.trim()} `
        : ""
      parts.push(`기저 ${name}${state.dm.insulin_basal} U`)
    }
    const meal = [state.dm.insulin_am, state.dm.insulin_md, state.dm.insulin_pm]
      .map((v) => (nonEmpty(v) ? v : "-"))
      .join("-")
    if (meal !== "-----") {
      const name = nonEmpty(state.dm.insulin_meal_name)
        ? `${state.dm.insulin_meal_name.trim()} `
        : ""
      parts.push(`식사 ${name}${meal} U`)
    }
    const detail = parts.length ? ` (${parts.join(" / ")})` : ""
    lines.push(`인슐린 사용 중${detail}.`)
  }
  return lines
}

function thyroidS(state: ChronicState): string[] {
  const hasThyroid =
    state.selectedDiseases.includes("HypoT") || state.selectedDiseases.includes("HyperT")
  if (!hasThyroid) return []
  if (nonEmpty(state.thyroid.medication)) {
    return [`갑상선 약물: ${state.thyroid.medication.trim()}.`]
  }
  return []
}

export function generateSubjective(state: ChronicState): string {
  const blocks: string[] = []
  blocks.push(...htnS(state))
  blocks.push(...dmS(state))
  blocks.push(...thyroidS(state))
  if (nonEmpty(state.additionalSubjective)) {
    blocks.push(state.additionalSubjective.trim())
  }
  return blocks.join("\n")
}
