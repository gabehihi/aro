import { describe, it, expect } from "vitest"
import { calcBMI, bmiCategory } from "../bmi"

describe("calcBMI", () => {
  it("calculates BMI for valid inputs", () => {
    expect(calcBMI(70, 170)).toBe(24.2)
  })
  it("returns null for zero height", () => {
    expect(calcBMI(70, 0)).toBeNull()
  })
  it("returns null for missing weight", () => {
    expect(calcBMI(null, 170)).toBeNull()
  })
})

describe("bmiCategory", () => {
  it("classifies 정상", () => {
    expect(bmiCategory(22)).toBe("정상")
  })
  it("classifies 저체중", () => {
    expect(bmiCategory(17)).toBe("저체중")
  })
  it("classifies 비만 1단계", () => {
    expect(bmiCategory(28)).toBe("비만 1단계")
  })
  it("returns null for null input", () => {
    expect(bmiCategory(null)).toBeNull()
  })
})
