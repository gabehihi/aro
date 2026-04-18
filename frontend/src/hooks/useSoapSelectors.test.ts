import { describe, expect, it } from "vitest"
import { toPatientContext } from "./useSoapSelectors"

describe("toPatientContext", () => {
  it("maps a patient into a stable SOAP patient context", () => {
    expect(
      toPatientContext({
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
      }).sex,
    ).toBe("M")
  })

  it("returns null fields when patient is missing", () => {
    expect(toPatientContext(null)).toEqual({ sex: null, age: null })
  })
})
