import type { SoapPrefillResponse } from "@/api/encounters"
import type { DiseaseId } from "./types"

export interface SoapPrefillPatch {
  selected_diseases: DiseaseId[]
  chronic_vs: Record<string, unknown>
  labs_by_name: Record<string, unknown>
  ckd_form: {
    labs_date: string
  }
  other_labs: Array<{
    name: string
    value: string | number | null
    unit: string
  }>
  education_flags: SoapPrefillResponse["education_flags"]
  last_encounter_date: string | null
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ""
  return value.slice(0, 10)
}

export function toPrefillPatch(data: SoapPrefillResponse): SoapPrefillPatch {
  const ckdMeasuredAt =
    data.labs_by_name.cr?.measured_at ??
    data.labs_by_name.egfr?.measured_at ??
    data.labs_by_name.acr?.measured_at ??
    null

  return {
    selected_diseases: data.selected_diseases as DiseaseId[],
    chronic_vs: data.chronic_vs,
    labs_by_name: Object.fromEntries(
      Object.entries(data.labs_by_name).map(([k, v]) => [k, v.value]),
    ),
    ckd_form: {
      labs_date: toDateInputValue(ckdMeasuredAt),
    },
    other_labs: data.other_labs.map((lab) => ({
      name: lab.name,
      value: lab.value,
      unit: lab.unit,
    })),
    education_flags: data.education_flags,
    last_encounter_date: data.last_encounter_date,
  }
}

export type AutomaticPrefillResolution =
  | { type: "apply"; patch: SoapPrefillPatch }
  | { type: "skip"; lastEncounterDate: string | null }

export function resolveAutomaticPrefill(
  data: SoapPrefillResponse,
  hasUserEdits: boolean,
): AutomaticPrefillResolution {
  if (hasUserEdits) {
    return {
      type: "skip",
      lastEncounterDate: data.last_encounter_date,
    }
  }
  return {
    type: "apply",
    patch: toPrefillPatch(data),
  }
}
