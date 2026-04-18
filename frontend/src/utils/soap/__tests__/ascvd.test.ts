import { describe, it, expect } from "vitest"
import { classifyASCVD, isAgeRisk } from "../ascvd"

describe("classifyASCVD", () => {
  it("classifies 초고위험군", () => {
    expect(
      classifyASCVD({ isVeryHighRisk: true, hasDM: false, riskFactorCount: 0 }).grade,
    ).toBe("초고위험군")
  })
  it("classifies 고위험군 with DM", () => {
    expect(
      classifyASCVD({ isVeryHighRisk: false, hasDM: true, riskFactorCount: 0 }).grade,
    ).toBe("고위험군")
  })
  it("classifies 고위험군 with 3+ risk factors", () => {
    expect(
      classifyASCVD({ isVeryHighRisk: false, hasDM: false, riskFactorCount: 3 }).grade,
    ).toBe("고위험군")
  })
  it("classifies 중등도위험군", () => {
    expect(
      classifyASCVD({ isVeryHighRisk: false, hasDM: false, riskFactorCount: 2 }).grade,
    ).toBe("중등도위험군")
  })
  it("classifies 저위험군", () => {
    expect(
      classifyASCVD({ isVeryHighRisk: false, hasDM: false, riskFactorCount: 0 }).grade,
    ).toBe("저위험군")
  })
})

describe("isAgeRisk", () => {
  it("male ≥ 45 is risk", () => {
    expect(isAgeRisk(45, "M")).toBe(true)
    expect(isAgeRisk(44, "M")).toBe(false)
  })
  it("female ≥ 55 is risk", () => {
    expect(isAgeRisk(55, "F")).toBe(true)
    expect(isAgeRisk(54, "F")).toBe(false)
  })
  it("returns false for null inputs", () => {
    expect(isAgeRisk(null, "M")).toBe(false)
    expect(isAgeRisk(50, null)).toBe(false)
  })
})
