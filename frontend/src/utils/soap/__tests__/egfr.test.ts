import { describe, it, expect } from "vitest"
import { calcEGFR } from "../egfr"

describe("calcEGFR (CKD-EPI 2021)", () => {
  it("computes eGFR for normal male", () => {
    const egfr = calcEGFR(1.0, 60, "M")
    expect(egfr).not.toBeNull()
    expect(egfr!).toBeGreaterThan(70)
    expect(egfr!).toBeLessThan(100)
  })
  it("computes eGFR for female", () => {
    const egfr = calcEGFR(0.7, 60, "F")
    expect(egfr).not.toBeNull()
    expect(egfr!).toBeGreaterThan(80)
  })
  it("returns null for missing inputs", () => {
    expect(calcEGFR(null, 60, "M")).toBeNull()
    expect(calcEGFR(1.0, null, "M")).toBeNull()
    expect(calcEGFR(1.0, 60, null)).toBeNull()
  })
})
