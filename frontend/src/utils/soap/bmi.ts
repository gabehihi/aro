/**
 * BMI 계산: 체중(kg) / 키(m)²
 */
export function calcBMI(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || heightCm === 0) return null
  const heightM = heightCm / 100
  return Number((weightKg / (heightM * heightM)).toFixed(1))
}

export function bmiCategory(bmi: number | null): string | null {
  if (bmi === null) return null
  if (bmi < 18.5) return "저체중"
  if (bmi < 23) return "정상"
  if (bmi < 25) return "과체중"
  if (bmi < 30) return "비만 1단계"
  if (bmi < 35) return "비만 2단계"
  return "고도비만"
}
