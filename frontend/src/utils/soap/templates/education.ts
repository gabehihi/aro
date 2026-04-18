import type { EducationFlags } from "../types"

export const EDUCATION_OPTIONS: { key: keyof EducationFlags; label: string }[] = [
  { key: "chronic_mgmt", label: "만성질환 관리" },
  { key: "diet", label: "식이요법" },
  { key: "exercise", label: "운동요법" },
  { key: "smoking_cessation", label: "금연" },
  { key: "alcohol_reduction", label: "금주" },
  { key: "regular_checkup", label: "정기검사" },
]
