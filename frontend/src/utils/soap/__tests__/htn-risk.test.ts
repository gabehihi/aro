import { describe, it, expect } from "vitest"
import { classifyHTNRisk } from "../htn-risk"

describe("classifyHTNRisk", () => {
  const base = {
    sbp: 130,
    dbp: 80,
    hasDM: false,
    hasCKD: false,
    hasCardiovascular: false,
    riskFactorCount: 0,
  }

  it("classifies 초고위험군 for cardiovascular history", () => {
    expect(classifyHTNRisk({ ...base, hasCardiovascular: true }).riskGroup).toBe("초고위험군")
  })
  it("classifies 고위험군 for DM", () => {
    expect(classifyHTNRisk({ ...base, hasDM: true }).riskGroup).toBe("고위험군")
  })
  it("classifies 고위험군 for stage 2 HTN", () => {
    expect(classifyHTNRisk({ ...base, sbp: 165 }).riskGroup).toBe("고위험군")
  })
  it("classifies 중등도위험군 for 2 risk factors", () => {
    const r = classifyHTNRisk({ ...base, riskFactorCount: 2 })
    expect(r.riskGroup).toBe("중등도위험군")
    expect(r.bpTarget).toBe("<140/90 mmHg")
  })
  it("classifies 저위험군 for 0 risk factors", () => {
    expect(classifyHTNRisk(base).riskGroup).toBe("저위험군")
  })
})
