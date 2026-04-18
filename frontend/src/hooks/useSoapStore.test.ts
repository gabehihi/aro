import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useSoapStore } from "./useSoapStore"
import { buildSoapRawInput, parseSoapRawInput } from "@/utils/soap/rawInput"
import { EMPTY_ACUTE_STATE, EMPTY_CHRONIC_STATE } from "@/utils/soap/types"
import type { Patient } from "@/types"

function makePatient(): Patient {
  return {
    id: "patient-1",
    chart_no: "A-0001",
    name: "홍길동",
    birth_date: "1970-01-01",
    sex: "M",
    phone: null,
    address: null,
    insurance_type: "건강보험",
    chronic_diseases: [],
    allergies: [],
    memo: null,
    messaging_consent: false,
    messaging_method: null,
    created_at: "2026-04-18T00:00:00",
    updated_at: "2026-04-18T00:00:00",
  }
}

describe("useSoapStore", () => {
  beforeEach(() => {
    useSoapStore.getState().reset()
  })

  afterEach(() => {
    useSoapStore.getState().reset()
  })

  it("marks user edits dirty and clears them when prefill is applied", () => {
    useSoapStore.getState().updateChronicVitals({ sbp: "130" })
    expect(useSoapStore.getState().hasUserEdits).toBe(true)

    useSoapStore.getState().applyPrefill({
      selected_diseases: ["HTN"],
      chronic_vs: { sbp: 120, waist: 88 },
      labs_by_name: { hba1c: 7.1 },
      ckd_form: { labs_date: "" },
      other_labs: [{ name: "CRP", value: 0.4, unit: "mg/dL" }],
      education_flags: { diet: true },
      last_encounter_date: "2026-04-18T00:00:00",
    })

    const state = useSoapStore.getState()
    expect(state.hasUserEdits).toBe(false)
    expect(state.activeChronicDisease).toBe("HTN")
    expect(state.chronic.vitals.sbp).toBe("120")
    expect(state.chronic.vitals.waist).toBe("88")
    expect(state.chronic.labs.hba1c).toBe("7.1")
    expect(state.chronic.otherLabs).toEqual([
      { name: "CRP", value: "0.4", unit: "mg/dL" },
    ])
  })

  it("replaces the entire prefillable field set instead of merging stale values", () => {
    useSoapStore.getState().updateChronicVitals({
      sbp: "130",
      hr: "72",
      waist: "91",
    })
    useSoapStore.getState().updateChronicLabs({
      hba1c: "7.1",
      hb: "13.2",
      acr: "45",
    })
    useSoapStore.getState().updateChronicForm("education", {
      smoking_cessation: true,
      exercise: true,
      chronic_mgmt: true,
    })
    useSoapStore.getState().addOtherLab()
    useSoapStore.getState().updateOtherLab(0, {
      name: "CRP",
      value: "0.4",
      unit: "mg/dL",
    })

    useSoapStore.getState().applyPrefill({
      selected_diseases: ["DM"],
      chronic_vs: { sbp: 118 },
      labs_by_name: { hba1c: 6.8 },
      ckd_form: { labs_date: "" },
      other_labs: [],
      education_flags: { diet: true },
      last_encounter_date: "2026-04-18T00:00:00",
    })

    const state = useSoapStore.getState()
    expect(state.chronic.selectedDiseases).toEqual(["DM"])
    expect(state.chronic.vitals).toMatchObject({
      sbp: "118",
      hr: "",
      waist: "",
    })
    expect(state.chronic.labs).toMatchObject({
      hba1c: "6.8",
      hb: "",
      acr: "",
    })
    expect(state.chronic.otherLabs).toEqual([])
    expect(state.chronic.education).toMatchObject({
      diet: true,
      smoking_cessation: false,
      exercise: false,
      chronic_mgmt: true,
    })
  })

  it("clears stale prefill metadata when a new patient is selected", () => {
    useSoapStore.getState().setLastEncounterDate("2026-04-10T00:00:00")
    useSoapStore.getState().updateChronicLabs({ hb: "13.2" })
    useSoapStore.getState().toggleDisease("HTN")

    useSoapStore.getState().setSelectedPatient(makePatient())

    const state = useSoapStore.getState()
    expect(state.lastEncounterDate).toBeNull()
    expect(state.activeChronicDisease).toBeNull()
    expect(state.hasUserEdits).toBe(false)
    expect(state.chronic.labs.hb).toBe("")
  })

  it("tracks a single active chronic disease while keeping multi-select", () => {
    useSoapStore.getState().toggleDisease("HTN")
    expect(useSoapStore.getState().activeChronicDisease).toBe("HTN")

    useSoapStore.getState().toggleDisease("DM")
    expect(useSoapStore.getState().activeChronicDisease).toBe("DM")
    expect(useSoapStore.getState().chronic.selectedDiseases).toEqual(["HTN", "DM"])

    useSoapStore.getState().setActiveChronicDisease("HTN")
    expect(useSoapStore.getState().activeChronicDisease).toBe("HTN")

    useSoapStore.getState().toggleDisease("HTN")
    expect(useSoapStore.getState().activeChronicDisease).toBe("DM")

    useSoapStore.getState().toggleDisease("DM")
    expect(useSoapStore.getState().activeChronicDisease).toBeNull()
  })

  it("restores prefillable values from a saved TEMPLATE_V2 snapshot", () => {
    const savedSnapshot = {
      mode: "chronic" as const,
      chronic: {
        ...EMPTY_CHRONIC_STATE,
        selectedDiseases: ["HTN", "CKD"] as const,
        vitals: {
          ...EMPTY_CHRONIC_STATE.vitals,
          sbp: "126",
          dbp: "74",
          bt: "36.7",
          waist: "87",
        },
        labs: {
          ...EMPTY_CHRONIC_STATE.labs,
          hba1c: "6.9",
          acr: "38",
          hb: "13.5",
        },
        ckd: {
          ...EMPTY_CHRONIC_STATE.ckd,
          labs_date: "2026-04-17",
        },
        otherLabs: [{ name: "CRP", value: "0.2", unit: "mg/dL" }],
        education: {
          ...EMPTY_CHRONIC_STATE.education,
          exercise: true,
          diet: true,
        },
      },
      acute: EMPTY_ACUTE_STATE,
      overrides: {},
    }
    const parsed = parseSoapRawInput<typeof savedSnapshot>(
      buildSoapRawInput(savedSnapshot),
    )
    expect(parsed?.snapshot.chronic.vitals.waist).toBe("87")

    useSoapStore.getState().setSelectedPatient(makePatient())
    useSoapStore.getState().applyPrefill({
      selected_diseases: [...parsed!.snapshot.chronic.selectedDiseases],
      chronic_vs: {
        sbp: 126,
        dbp: 74,
        bt: 36.7,
        waist: 87,
      },
      labs_by_name: {
        hba1c: 6.9,
        acr: 38,
        hb: 13.5,
      },
      ckd_form: { labs_date: "2026-04-17" },
      other_labs: [{ name: "CRP", value: 0.2, unit: "mg/dL" }],
      education_flags: {
        exercise: true,
        diet: true,
      },
      last_encounter_date: "2026-04-18T09:00:00",
    })

    const restored = useSoapStore.getState()
    expect(restored.activeChronicDisease).toBe("HTN")
    expect(restored.chronic.selectedDiseases).toEqual(["HTN", "CKD"])
    expect(restored.chronic.vitals).toMatchObject({
      sbp: "126",
      dbp: "74",
      bt: "36.7",
      waist: "87",
    })
    expect(restored.chronic.labs).toMatchObject({
      hba1c: "6.9",
      acr: "38",
      hb: "13.5",
    })
    expect(restored.chronic.otherLabs).toEqual([
      { name: "CRP", value: "0.2", unit: "mg/dL" },
    ])
    expect(restored.chronic.ckd.labs_date).toBe("2026-04-17")
    expect(restored.chronic.education).toMatchObject({
      exercise: true,
      diet: true,
    })
    expect(restored.lastEncounterDate).toBe("2026-04-18T09:00:00")
    expect(restored.hasUserEdits).toBe(false)
  })
})
