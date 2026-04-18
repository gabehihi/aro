import { describe, expect, it } from "vitest"
import { EMPTY_ACUTE_STATE, EMPTY_CHRONIC_STATE } from "../types"
import {
  buildSoapRawInput,
  parseSoapRawInput,
  SOAP_TEMPLATE_VERSION,
} from "../rawInput"

describe("buildSoapRawInput", () => {
  it("prefixes snapshots with TEMPLATE_V2", () => {
    const snapshot = {
      mode: "chronic",
      chronic: { selectedDiseases: ["HTN"] },
      acute: { toggles: [] },
    }
    const rawInput = buildSoapRawInput(snapshot)
    const [version, payload] = rawInput.split("|", 2)

    expect(version).toBe(SOAP_TEMPLATE_VERSION)
    expect(JSON.parse(payload)).toEqual(snapshot)
  })

  it("round-trips a full SOAP snapshot through raw_input", () => {
    const snapshot = {
      mode: "acute",
      chronic: {
        ...EMPTY_CHRONIC_STATE,
        selectedDiseases: ["HTN", "CKD"],
        vitals: {
          ...EMPTY_CHRONIC_STATE.vitals,
          sbp: "128",
          dbp: "78",
          waist: "89",
        },
        labs: {
          ...EMPTY_CHRONIC_STATE.labs,
          acr: "45",
          hb: "13.1",
        },
        otherLabs: [{ name: "CRP", value: "0.4", unit: "mg/dL" }],
      },
      acute: {
        ...EMPTY_ACUTE_STATE,
        toggles: [{ symptomId: "cough", sign: "+" as const }],
        assessment: { diagnosis: "Acute bronchitis" },
      },
      overrides: { o: "사용자 수정 Objective" },
    }

    const parsed = parseSoapRawInput<typeof snapshot>(buildSoapRawInput(snapshot))

    expect(parsed).toEqual({
      version: SOAP_TEMPLATE_VERSION,
      snapshot,
    })
  })

  it("returns null for malformed raw_input", () => {
    expect(parseSoapRawInput("not-a-template")).toBeNull()
    expect(parseSoapRawInput("TEMPLATE_V2|{broken")).toBeNull()
  })
})
