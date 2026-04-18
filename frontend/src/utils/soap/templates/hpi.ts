import {
  EMPTY_ACUTE_OBJECTIVE,
  EMPTY_ACUTE_PLAN,
  type AcuteState,
  type SymptomCategory,
} from "../types"
import { getSymptom, groupSymptomsByCategory } from "../symptoms"
import { SYMPTOM_CATEGORIES } from "../types"

function nonEmpty(s: string | undefined | null): boolean {
  return !!s && s.trim().length > 0
}

function onsetPhrase(onset: string): string {
  return nonEmpty(onset) ? onset.trim() : "[발생일 미기재]"
}

function durationPhrase(duration: string): string {
  return nonEmpty(duration) ? duration.trim() : ""
}

function fillTemplate(tpl: string, onset: string, duration: string): string {
  return tpl.replace("{onset}", onsetPhrase(onset)).replace("{duration}", durationPhrase(duration))
}

function hasAcuteSignal(state: AcuteState): boolean {
  const objective = state.objective
  const objectiveTouched =
    nonEmpty(objective.vitals.sbp) ||
    nonEmpty(objective.vitals.dbp) ||
    nonEmpty(objective.vitals.hr) ||
    nonEmpty(objective.vitals.bt) ||
    objective.appearance !== EMPTY_ACUTE_OBJECTIVE.appearance ||
    objective.pi !== EMPTY_ACUTE_OBJECTIVE.pi ||
    objective.pth !== EMPTY_ACUTE_OBJECTIVE.pth ||
    objective.breath_base !== EMPTY_ACUTE_OBJECTIVE.breath_base ||
    objective.breath_extra !== EMPTY_ACUTE_OBJECTIVE.breath_extra ||
    objective.abd_soft !== EMPTY_ACUTE_OBJECTIVE.abd_soft ||
    objective.abd_shape !== EMPTY_ACUTE_OBJECTIVE.abd_shape ||
    objective.abd_bs !== EMPTY_ACUTE_OBJECTIVE.abd_bs ||
    objective.abd_td !== EMPTY_ACUTE_OBJECTIVE.abd_td ||
    nonEmpty(objective.abd_td_location) ||
    objective.cvat !== EMPTY_ACUTE_OBJECTIVE.cvat ||
    nonEmpty(objective.cvat_detail) ||
    nonEmpty(objective.extra)

  const planTouched =
    state.plan.antibiotics !== EMPTY_ACUTE_PLAN.antibiotics ||
    state.plan.revisit !== EMPTY_ACUTE_PLAN.revisit ||
    state.plan.hydration !== EMPTY_ACUTE_PLAN.hydration ||
    nonEmpty(state.plan.extra)

  return (
    state.toggles.length > 0 ||
    nonEmpty(state.onset) ||
    nonEmpty(state.duration) ||
    nonEmpty(state.pattern) ||
    nonEmpty(state.additional) ||
    objectiveTouched ||
    nonEmpty(state.assessment.diagnosis) ||
    planTouched
  )
}

export function generateAcuteSubjective(state: AcuteState): string {
  if (state.toggles.length === 0 && !nonEmpty(state.additional)) return ""

  const positives = state.toggles.filter((t) => t.sign === "+")
  const negatives = state.toggles.filter((t) => t.sign === "-")

  const lines: string[] = []

  // CC
  const cc = state.ccSymptomId ? getSymptom(state.ccSymptomId) : null
  if (cc) {
    const onset = nonEmpty(state.onset) ? ` (${state.onset} 시작)` : ""
    lines.push(`CC) ${cc.label}${onset}`)
  } else if (positives.length > 0) {
    lines.push("CC) [주 증상 선택 필요]")
  }

  // HPI
  if (positives.length > 0) {
    const ccId = cc?.id
    const sameCategory = positives.filter((t) => {
      const s = getSymptom(t.symptomId)
      return s && cc && s.category === cc.category
    })
    const otherPos = positives.filter((t) => {
      const s = getSymptom(t.symptomId)
      return !cc || !s || s.category !== cc.category
    })
    const ordered = [
      ...(ccId ? sameCategory.filter((t) => t.symptomId === ccId) : []),
      ...sameCategory.filter((t) => t.symptomId !== ccId),
      ...otherPos,
    ]
    const hpiLines = ordered
      .map((t) => getSymptom(t.symptomId))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => fillTemplate(s.hpiTemplate, state.onset, state.duration))
    if (negatives.length > 0) {
      const negLabels = negatives
        .map((t) => getSymptom(t.symptomId)?.label)
        .filter(Boolean)
        .join(", ")
      hpiLines.push(`${negLabels}: 동반되지 않음 (-).`)
    }
    if (nonEmpty(state.pattern)) hpiLines.push(`양상: ${state.pattern.trim()}.`)
    lines.push("HPI) " + hpiLines.join(" "))
  }

  // ROS — all toggles grouped by category
  if (state.toggles.length > 0) {
    const byId: Record<string, "+" | "-"> = {}
    for (const t of state.toggles) byId[t.symptomId] = t.sign
    const grouped = groupSymptomsByCategory()
    const rosBits: string[] = []
    for (const cat of SYMPTOM_CATEGORIES as readonly SymptomCategory[]) {
      const inCat = grouped[cat].filter((s) => byId[s.id])
      if (inCat.length === 0) continue
      const formatted = inCat.map((s) => `${s.label}(${byId[s.id]})`).join(", ")
      rosBits.push(`${cat}: ${formatted}`)
    }
    if (rosBits.length > 0) lines.push("ROS) " + rosBits.join(" / "))
  }

  if (nonEmpty(state.additional)) lines.push(state.additional.trim())

  return lines.join("\n")
}

export function generateAcuteObjective(state: AcuteState): string {
  if (!hasAcuteSignal(state)) return ""

  const { objective } = state
  const lines: string[] = []

  const bp =
    nonEmpty(objective.vitals.sbp) || nonEmpty(objective.vitals.dbp)
      ? `${objective.vitals.sbp || "___"}/${objective.vitals.dbp || "___"}`
      : ""
  const vsParts = [bp, objective.vitals.hr].filter(Boolean)
  if (vsParts.length || nonEmpty(objective.vitals.bt)) {
    let vsLine = `V/S : ${vsParts.join(" - ")}`
    if (nonEmpty(objective.vitals.bt)) {
      const bt = `${objective.vitals.bt}℃`
      vsLine += vsParts.length ? `, ${bt}` : bt
    }
    lines.push(vsLine.trim())
  }

  lines.push(`${objective.appearance} appearance`)
  lines.push(`PI ${objective.pi}/PTH ${objective.pth}`)

  const breathExtra =
    objective.breath_extra === "without"
      ? "without adventitious sound"
      : objective.breath_extra
  lines.push(`${objective.breath_base} breath sound, ${breathExtra}`)

  const tenderness =
    objective.abd_td === "Td (+)"
      ? `Td (+)${nonEmpty(objective.abd_td_location) ? ` at ${objective.abd_td_location.trim()}` : ""}`
      : "no abd Td/rTd"
  lines.push(
    `${objective.abd_soft}, ${objective.abd_shape}, ${objective.abd_bs} BS, ${tenderness}`,
  )

  if (objective.cvat === "Neg") {
    lines.push("CVAT Neg")
  } else {
    lines.push(
      `CVAT Pos${nonEmpty(objective.cvat_detail) ? `: ${objective.cvat_detail.trim()}` : ""}`,
    )
  }

  if (nonEmpty(objective.extra)) {
    lines.push(objective.extra.trim())
  }

  return lines.join("\n")
}

export function generateAcuteAssessment(state: AcuteState): string {
  if (!hasAcuteSignal(state)) return ""
  const diagnosis = state.assessment.diagnosis.trim()
  return diagnosis ? `# ${diagnosis}` : ""
}

export function generateAcutePlan(state: AcuteState): string {
  if (!hasAcuteSignal(state)) return ""

  const lines: string[] = []
  if (state.plan.antibiotics) {
    lines.push("항생제 포함하여 약물 복용.")
  }
  if (state.plan.revisit) {
    lines.push("호전 없거나 증상 악화 시 재내원.")
  }
  if (state.plan.hydration) {
    lines.push("적절한 수분 섭취 격려.")
  }
  if (nonEmpty(state.plan.extra)) {
    for (const line of state.plan.extra.trim().split("\n")) {
      const trimmed = line.trim()
      if (trimmed) lines.push(trimmed)
    }
  }
  return lines.join("\n")
}
