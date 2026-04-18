import type { AcuteState, ChronicState, PatientContext } from "./types"
import { generateSubjective } from "./templates/subjective"
import { generateObjective } from "./templates/objective"
import { generateAssessment } from "./templates/assessment"
import { generatePlan } from "./templates/plan"
import {
  generateAcuteAssessment,
  generateAcuteObjective,
  generateAcutePlan,
  generateAcuteSubjective,
} from "./templates/hpi"

export interface SoapSections {
  s: string
  o: string
  a: string
  p: string
}

export interface ManualOverrides {
  s?: string
  o?: string
  a?: string
  p?: string
}

function mergeParagraphs(...parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0)
    .join("\n\n")
}

function mergeLines(...parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0)
    .join("\n")
}

export function composeSoap(
  chronic: ChronicState,
  acute: AcuteState,
  patient: PatientContext,
  overrides: ManualOverrides = {},
): SoapSections {
  const templateS = mergeParagraphs(
    generateAcuteSubjective(acute),
    generateSubjective(chronic),
  )
  const templateO = mergeParagraphs(
    generateObjective(chronic, patient),
    generateAcuteObjective(acute),
  )
  const templateA = mergeLines(
    generateAssessment(chronic, patient),
    generateAcuteAssessment(acute),
  )
  const templateP = mergeParagraphs(
    generatePlan(chronic, patient),
    generateAcutePlan(acute),
  )

  return {
    s: overrides.s ?? templateS,
    o: overrides.o ?? templateO,
    a: overrides.a ?? templateA,
    p: overrides.p ?? templateP,
  }
}

/**
 * 섹션 4개를 EMR 붙여넣기용 단일 문자열로 조립
 */
export function formatSoapForCopy(sections: SoapSections): string {
  const parts: string[] = []
  if (sections.s) parts.push(`S) ${sections.s}`)
  if (sections.o) parts.push(`O) ${sections.o}`)
  if (sections.a) parts.push(`A) ${sections.a}`)
  if (sections.p) parts.push(`P) ${sections.p}`)
  return parts.join("\n\n")
}
