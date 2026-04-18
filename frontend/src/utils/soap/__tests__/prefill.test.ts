import { describe, expect, it } from "vitest"
import { resolveAutomaticPrefill, toPrefillPatch } from "../prefill"
import type { SoapPrefillResponse } from "@/api/encounters"

const SAMPLE_PREFILL: SoapPrefillResponse = {
  selected_diseases: ["HTN", "CKD"],
  chronic_vs: { sbp: 126, dbp: 74, waist: 87 },
  labs_by_name: {
    cr: {
      name: "cr",
      value: 2.1,
      unit: "mg/dL",
      flag: "H",
      measured_at: "2026-04-17T08:10:00",
    },
    acr: {
      name: "acr",
      value: 38,
      unit: "mg/g",
      flag: "H",
      measured_at: "2026-04-18T09:30:00",
    },
  },
  other_labs: [
    {
      name: "CRP",
      value: 0.2,
      unit: "mg/dL",
      flag: null,
      measured_at: "2026-04-18T09:30:00",
    },
  ],
  education_flags: {
    smoking_cessation: false,
    alcohol_reduction: false,
    exercise: true,
    diet: true,
  },
  last_encounter_date: "2026-04-18T09:30:00",
}

describe("prefill helpers", () => {
  it("converts API payloads into store patches", () => {
    expect(toPrefillPatch(SAMPLE_PREFILL)).toEqual({
      selected_diseases: ["HTN", "CKD"],
      chronic_vs: { sbp: 126, dbp: 74, waist: 87 },
      labs_by_name: { cr: 2.1, acr: 38 },
      ckd_form: { labs_date: "2026-04-17" },
      other_labs: [{ name: "CRP", value: 0.2, unit: "mg/dL" }],
      education_flags: SAMPLE_PREFILL.education_flags,
      last_encounter_date: "2026-04-18T09:30:00",
    })
  })

  it("skips automatic prefill application when user edits already exist", () => {
    expect(resolveAutomaticPrefill(SAMPLE_PREFILL, true)).toEqual({
      type: "skip",
      lastEncounterDate: "2026-04-18T09:30:00",
    })
  })

  it("applies automatic prefill when the form is still pristine", () => {
    expect(resolveAutomaticPrefill(SAMPLE_PREFILL, false)).toEqual({
      type: "apply",
      patch: toPrefillPatch(SAMPLE_PREFILL),
    })
  })
})
