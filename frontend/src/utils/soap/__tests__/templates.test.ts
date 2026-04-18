import { describe, it, expect } from "vitest"
import { EMPTY_CHRONIC_STATE, EMPTY_ACUTE_STATE } from "../types"
import type { ChronicState, AcuteState, PatientContext } from "../types"
import { generateSubjective } from "../templates/subjective"
import { generateObjective } from "../templates/objective"
import { generateAssessment, getKCDCodesForSave } from "../templates/assessment"
import { generatePlan } from "../templates/plan"
import {
  generateAcuteAssessment,
  generateAcuteObjective,
  generateAcutePlan,
  generateAcuteSubjective,
} from "../templates/hpi"
import { composeSoap, formatSoapForCopy } from "../soapFormatter"

function makeChronic(overrides: Partial<ChronicState> = {}): ChronicState {
  return { ...EMPTY_CHRONIC_STATE, ...overrides }
}
function makeAcute(overrides: Partial<AcuteState> = {}): AcuteState {
  return { ...EMPTY_ACUTE_STATE, ...overrides }
}
const PATIENT: PatientContext = { sex: "M", age: 60 }

describe("generateSubjective (chronic)", () => {
  it("emits 가정혈압 not-measured line by default for HTN", () => {
    const state = makeChronic({ selectedDiseases: ["HTN"] })
    expect(generateSubjective(state)).toContain("가정혈압 측정하지 않음")
  })
  it("emits 가정혈압 measured with values", () => {
    const state = makeChronic({
      selectedDiseases: ["HTN"],
      htn: { ...EMPTY_CHRONIC_STATE.htn, home_bp_measured: true, home_sbp: "130", home_dbp: "80" },
    })
    const s = generateSubjective(state)
    expect(s).toContain("가정혈압 측정함")
    expect(s).toContain("130/80")
  })
  it("emits DM insulin line when used", () => {
    const state = makeChronic({
      selectedDiseases: ["DM"],
      dm: { ...EMPTY_CHRONIC_STATE.dm, insulin_used: true, insulin_basal: "10" },
    })
    expect(generateSubjective(state)).toContain("인슐린")
  })
  it("returns empty string when no diseases", () => {
    expect(generateSubjective(makeChronic())).toBe("")
  })
})

describe("generateObjective (chronic)", () => {
  it("emits V/S line when SBP+DBP given", () => {
    const state = makeChronic({
      vitals: { ...EMPTY_CHRONIC_STATE.vitals, sbp: "130", dbp: "80", hr: "72" },
    })
    expect(generateObjective(state, PATIENT)).toContain("130/80 - 72")
  })
  it("emits BMI with category", () => {
    const state = makeChronic({
      vitals: { ...EMPTY_CHRONIC_STATE.vitals, bw: "70", bh: "170" },
    })
    const o = generateObjective(state, PATIENT)
    expect(o).toContain("BMI 24.2")
    expect(o).toContain("과체중")
  })
  it("includes waist circumference when present", () => {
    const state = makeChronic({
      vitals: { ...EMPTY_CHRONIC_STATE.vitals, waist: "90" },
    })
    expect(generateObjective(state, PATIENT)).toContain("허리둘레 90cm")
  })
  it("includes eGFR + stage when CKD selected with Cr", () => {
    const state = makeChronic({
      selectedDiseases: ["CKD"],
      labs: { ...EMPTY_CHRONIC_STATE.labs, cr: "2.0" },
    })
    const o = generateObjective(state, PATIENT)
    expect(o).toContain("eGFR")
    expect(o).toContain("CKD stage")
  })
  it("includes ACR, Vit D, Hb, and custom labs", () => {
    const state = makeChronic({
      selectedDiseases: ["CKD"],
      labs: {
        ...EMPTY_CHRONIC_STATE.labs,
        acr: "45",
        vitd: "28",
        hb: "13.2",
      },
      otherLabs: [{ name: "CRP", value: "0.4", unit: "mg/dL" }],
    })
    const objective = generateObjective(state, PATIENT)
    expect(objective).toContain("ACR 45 mg/g")
    expect(objective).toContain("Vit D 28 ng/mL")
    expect(objective).toContain("Hb 13.2 g/dL")
    expect(objective).toContain("CRP 0.4 mg/dL")
  })
})

describe("generateAssessment", () => {
  it("emits English medical terms for chronic diagnoses", () => {
    const s = generateAssessment(
      makeChronic({ selectedDiseases: ["HTN", "DM", "DL", "MASLD"] }),
      PATIENT,
    )
    expect(s).toContain("# HTN")
    expect(s).toContain("# DM")
    expect(s).toContain("# DysL")
    expect(s).toContain("# MASLD")
  })
  it("emits CKD stage label with eGFR and labs date when Cr given", () => {
    const s = generateAssessment(
      makeChronic({
        selectedDiseases: ["CKD"],
        labs: { ...EMPTY_CHRONIC_STATE.labs, cr: "3.0" },
        ckd: { ...EMPTY_CHRONIC_STATE.ckd, labs_date: "2025-05-27" },
      }),
      PATIENT,
    )
    expect(s).toMatch(/CKD stage/)
    expect(s).toContain("eGFR")
    expect(s).toContain("2025-05-27")
  })
  it("appends extra diagnoses", () => {
    const s = generateAssessment(
      makeChronic({ extraDiagnoses: ["위염"] }),
      PATIENT,
    )
    expect(s).toContain("# 위염")
  })
})

describe("getKCDCodesForSave", () => {
  it("returns canonical codes for selected diseases", () => {
    const codes = getKCDCodesForSave(
      makeChronic({ selectedDiseases: ["HTN", "DM"] }),
    )
    expect(codes).toEqual([
      { code: "I10", description: expect.any(String) },
      { code: "E11.9", description: expect.any(String) },
    ])
  })
})

describe("generatePlan", () => {
  it("keeps monitoring targets without medication adjustment boilerplate", () => {
    const p = generatePlan(
      makeChronic({
        selectedDiseases: ["HTN", "DM", "DL", "CKD", "HypoT", "HyperT"],
        vitals: { ...EMPTY_CHRONIC_STATE.vitals, sbp: "135", dbp: "85" },
        labs: { ...EMPTY_CHRONIC_STATE.labs, cr: "1.8" },
        ckd: { ...EMPTY_CHRONIC_STATE.ckd, is_dialysis: true },
      }),
      PATIENT,
    )
    expect(p).toMatch(/BP 목표/)
    expect(p).toContain("혈당/HbA1c 추이 확인.")
    expect(p).toContain("LDL 목표")
    expect(p).toContain("신기능/단백뇨 추이 확인")
    expect(p).toContain("투석 관련 경과 추적.")
    expect(p).toContain("TSH 추이 확인.")
    expect(p).toContain("TSH/fT4 추이 확인.")
    expect(p).not.toMatch(/\bHTN\b/)
    expect(p).not.toMatch(/\bDM\b/)
    expect(p).not.toMatch(/\bCKD\b/)
    expect(p).not.toContain("Hypothyroidism")
    expect(p).not.toContain("Hyperthyroidism")
    expect(p).not.toContain("Dyslipidemia")
    expect(p).not.toMatch(/유지\/조정/)
    expect(p).not.toContain("[의사 소견")
    expect(p).not.toContain("Statin")
    expect(p).not.toContain("RAAS inhibitor")
    expect(p).not.toContain("Levothyroxine")
    expect(p).not.toContain("인슐린 용량 재검토")
  })
  it("includes education lines", () => {
    const p = generatePlan(
      makeChronic({
        education: { ...EMPTY_CHRONIC_STATE.education, smoking_cessation: true, diet: true },
      }),
      PATIENT,
    )
    expect(p).toContain("금연 교육함")
    expect(p).toContain("식이요법 교육함")
  })
})

describe("generateAcuteSubjective", () => {
  it("emits CC and HPI when cough selected as CC", () => {
    const state = makeAcute({
      toggles: [{ symptomId: "cough", sign: "+" }],
      ccSymptomId: "cough",
      onset: "3일 전",
      duration: "지속적",
    })
    const s = generateAcuteSubjective(state)
    expect(s).toContain("CC) 기침")
    expect(s).toContain("3일 전")
    expect(s).toContain("ROS)")
  })
  it("lists pertinent negatives", () => {
    const state = makeAcute({
      toggles: [
        { symptomId: "cough", sign: "+" },
        { symptomId: "fever", sign: "-" },
      ],
      ccSymptomId: "cough",
      onset: "2일 전",
      duration: "지속적",
    })
    const s = generateAcuteSubjective(state)
    expect(s).toContain("발열")
    expect(s).toContain("(-)")
  })
  it("returns empty for no toggles", () => {
    expect(generateAcuteSubjective(makeAcute())).toBe("")
  })
})

describe("generateAcuteObjective", () => {
  it("returns empty when acute flow is untouched", () => {
    expect(generateAcuteObjective(makeAcute())).toBe("")
  })
  it("emits default acute exam lines once acute symptoms exist", () => {
    const objective = generateAcuteObjective(
      makeAcute({
        toggles: [{ symptomId: "cough", sign: "+" }],
      }),
    )
    expect(objective).toContain("Not so ill-looking appearance")
    expect(objective).toContain("PI -/PTH -")
    expect(objective).toContain("CVAT Neg")
  })
  it("includes vitals and positive abdominal tenderness details", () => {
    const state = makeAcute({
      toggles: [{ symptomId: "abd_pain", sign: "+" }],
      objective: {
        ...EMPTY_ACUTE_STATE.objective,
        vitals: { sbp: "130", dbp: "80", hr: "92", bt: "38.1" },
        abd_td: "Td (+)",
        abd_td_location: "RLQ",
      },
    })
    const objective = generateAcuteObjective(state)
    expect(objective).toContain("V/S : 130/80 - 92, 38.1℃")
    expect(objective).toContain("Td (+) at RLQ")
  })
})

describe("generateAcuteAssessment", () => {
  it("formats diagnosis as assessment hash line", () => {
    const assessment = generateAcuteAssessment(
      makeAcute({
        assessment: { diagnosis: "Pneumonia" },
      }),
    )
    expect(assessment).toBe("# Pneumonia")
  })
})

describe("generateAcutePlan", () => {
  it("returns empty when acute flow is untouched", () => {
    expect(generateAcutePlan(makeAcute())).toBe("")
  })
  it("emits default revisit and hydration lines once acute flow is active", () => {
    const plan = generateAcutePlan(
      makeAcute({
        toggles: [{ symptomId: "cough", sign: "+" }],
      }),
    )
    expect(plan).toContain("호전 없거나 증상 악화 시 재내원.")
    expect(plan).toContain("적절한 수분 섭취 격려.")
  })
  it("includes antibiotics and extra plan lines", () => {
    const plan = generateAcutePlan(
      makeAcute({
        assessment: { diagnosis: "Acute bronchitis" },
        plan: {
          ...EMPTY_ACUTE_STATE.plan,
          antibiotics: true,
          extra: "3일 후 경과 관찰\n수분 섭취 유지",
        },
      }),
    )
    expect(plan).toContain("항생제 포함하여 약물 복용.")
    expect(plan).toContain("3일 후 경과 관찰")
    expect(plan).toContain("수분 섭취 유지")
  })
})

describe("composeSoap and formatSoapForCopy", () => {
  it("composes 4 sections", () => {
    const chronic = makeChronic({
      selectedDiseases: ["HTN"],
      vitals: { ...EMPTY_CHRONIC_STATE.vitals, sbp: "130", dbp: "80" },
    })
    const result = composeSoap(chronic, EMPTY_ACUTE_STATE, PATIENT)
    expect(result.s).toBeTruthy()
    expect(result.o).toBeTruthy()
    expect(result.a).toContain("# HTN")
    expect(result.p).toBeTruthy()
  })
  it("merges acute objective, assessment, and plan into the final SOAP", () => {
    const acute = makeAcute({
      toggles: [{ symptomId: "cough", sign: "+" }],
      assessment: { diagnosis: "Acute bronchitis" },
      plan: { ...EMPTY_ACUTE_STATE.plan, antibiotics: true },
    })
    const result = composeSoap(EMPTY_CHRONIC_STATE, acute, PATIENT)
    expect(result.o).toContain("Not so ill-looking appearance")
    expect(result.a).toContain("# Acute bronchitis")
    expect(result.p).toContain("항생제 포함하여 약물 복용.")
  })
  it("respects manual overrides", () => {
    const chronic = makeChronic({ selectedDiseases: ["HTN"] })
    const result = composeSoap(chronic, EMPTY_ACUTE_STATE, PATIENT, {
      a: "# 사용자 수정본",
    })
    expect(result.a).toBe("# 사용자 수정본")
  })
  it("formats output with section headers", () => {
    const text = formatSoapForCopy({ s: "AAA", o: "BBB", a: "CCC", p: "DDD" })
    expect(text).toBe("S) AAA\n\nO) BBB\n\nA) CCC\n\nP) DDD")
  })
})
