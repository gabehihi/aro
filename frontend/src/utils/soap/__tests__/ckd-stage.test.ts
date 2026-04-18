import { describe, it, expect } from "vitest"
import { getCKDStage } from "../ckd-stage"

describe("getCKDStage", () => {
  it.each([
    [95, "G1"],
    [80, "G2"],
    [50, "G3a"],
    [35, "G3b"],
    [20, "G4"],
    [10, "G5"],
  ])("eGFR %i → %s", (egfr, stage) => {
    expect(getCKDStage(egfr)?.stage).toBe(stage)
  })
  it("returns null for null input", () => {
    expect(getCKDStage(null)).toBeNull()
  })
})
