import { describe, it, expect } from "vitest"
import { getKDIGOStatin } from "../kdigo-statin"

describe("getKDIGOStatin", () => {
  const base = { age: 55, egfr: 70, hasDM: false, isVeryHighRisk: false, isDialysis: false }

  it("returns strong recommendation for ≥50 + eGFR<60", () => {
    const r = getKDIGOStatin({ ...base, age: 55, egfr: 50 })
    expect(r?.level).toBe("strong")
  })
  it("returns moderate for ≥50 + eGFR≥60", () => {
    const r = getKDIGOStatin({ ...base, age: 55, egfr: 70 })
    expect(r?.level).toBe("moderate")
  })
  it("returns moderate for <50 with DM", () => {
    const r = getKDIGOStatin({ ...base, age: 40, hasDM: true })
    expect(r?.level).toBe("moderate")
  })
  it("returns neutral for <50 low-risk", () => {
    const r = getKDIGOStatin({ ...base, age: 40 })
    expect(r?.level).toBe("neutral")
  })
  it("returns gray for dialysis", () => {
    const r = getKDIGOStatin({ ...base, isDialysis: true })
    expect(r?.level).toBe("gray")
  })
  it("returns null for missing age", () => {
    expect(getKDIGOStatin({ ...base, age: null })).toBeNull()
  })
})
