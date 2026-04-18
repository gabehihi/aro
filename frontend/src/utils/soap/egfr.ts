/**
 * eGFR 계산: CKD-EPI Creatinine 2021 (race-free)
 */
export function calcEGFR(
  scr: number | null,
  age: number | null,
  sex: "M" | "F" | null,
): number | null {
  if (!scr || !age || !sex) return null
  const kappa = sex === "F" ? 0.7 : 0.9
  const alpha = sex === "F" ? -0.241 : -0.302
  const minRatio = Math.min(scr / kappa, 1)
  const maxRatio = Math.max(scr / kappa, 1)

  let egfr =
    142 * Math.pow(minRatio, alpha) * Math.pow(maxRatio, -1.2) * Math.pow(0.9938, age)
  if (sex === "F") egfr *= 1.012
  return Number(egfr.toFixed(1))
}
