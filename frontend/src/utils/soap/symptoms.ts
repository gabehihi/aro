import type { SymptomCategory, SymptomDef } from "./types"
import { SYMPTOM_CATEGORIES } from "./types"

export const SYMPTOMS: SymptomDef[] = [
  // 전신
  { id: "fever", label: "발열", category: "전신", hpiTemplate: "{onset} 시작된 발열이 {duration} 지속됨." },
  { id: "chill", label: "오한", category: "전신", hpiTemplate: "{onset}부터 오한 동반됨." },
  { id: "myalgia", label: "근육통", category: "전신", hpiTemplate: "{onset}부터 전신 근육통 호소함." },
  { id: "fatigue", label: "피곤", category: "전신", hpiTemplate: "{onset}부터 피곤감 지속됨." },
  { id: "weight_change", label: "체중변화", category: "전신", hpiTemplate: "최근 체중 변화 호소함." },

  // 두경부
  { id: "headache", label: "두통", category: "두경부", hpiTemplate: "{onset} 시작된 두통이 {duration} 지속됨." },
  { id: "dizziness", label: "어지럼", category: "두경부", hpiTemplate: "{onset}부터 어지럼 호소함." },
  { id: "sore_throat", label: "인후통", category: "두경부", hpiTemplate: "{onset}부터 인후통 지속됨." },
  { id: "hoarseness", label: "쉰 목소리", category: "두경부", hpiTemplate: "{onset}부터 쉰 목소리 동반됨." },

  // 호흡기
  { id: "cough", label: "기침", category: "호흡기", hpiTemplate: "{onset} 시작된 기침이 {duration} 관찰됨." },
  { id: "sputum", label: "가래", category: "호흡기", hpiTemplate: "{onset}부터 가래 동반됨." },
  { id: "rhinorrhea", label: "콧물", category: "호흡기", hpiTemplate: "{onset}부터 콧물 호소함." },
  { id: "nasal_obstruction", label: "코막힘", category: "호흡기", hpiTemplate: "{onset}부터 코막힘 호소함." },
  { id: "dyspnea", label: "호흡곤란", category: "호흡기", hpiTemplate: "{onset}부터 호흡곤란 호소함." },
  { id: "chest_pain", label: "흉통", category: "호흡기", hpiTemplate: "{onset}부터 흉통 호소함." },

  // 복부
  { id: "abd_pain", label: "복통", category: "복부", hpiTemplate: "{onset} 시작된 복통이 {duration} 지속됨." },
  { id: "flank_pain", label: "옆구리 통증", category: "복부", hpiTemplate: "{onset}부터 옆구리 통증 호소함." },

  // 소화기
  { id: "anorexia", label: "식욕저하", category: "소화기", hpiTemplate: "{onset}부터 식욕저하 호소함." },
  { id: "nausea", label: "구역", category: "소화기", hpiTemplate: "{onset}부터 구역 호소함." },
  { id: "vomiting", label: "구토", category: "소화기", hpiTemplate: "{onset}부터 구토 동반됨." },
  { id: "constipation", label: "변비", category: "소화기", hpiTemplate: "{onset}부터 변비 호소함." },
  { id: "diarrhea", label: "설사", category: "소화기", hpiTemplate: "{onset}부터 설사 지속됨." },

  // 비뇨기
  { id: "frequency", label: "빈뇨", category: "비뇨기", hpiTemplate: "{onset}부터 빈뇨 호소함." },
  { id: "urgency", label: "요절박", category: "비뇨기", hpiTemplate: "{onset}부터 요절박 호소함." },
  { id: "nocturia", label: "야간뇨", category: "비뇨기", hpiTemplate: "{onset}부터 야간뇨 호소함." },
  { id: "dysuria", label: "배뇨통", category: "비뇨기", hpiTemplate: "{onset}부터 배뇨통 호소함." },
]

const SYMPTOM_BY_ID: Record<string, SymptomDef> = Object.fromEntries(
  SYMPTOMS.map((s) => [s.id, s]),
)

export function getSymptom(id: string): SymptomDef | undefined {
  return SYMPTOM_BY_ID[id]
}

export function groupSymptomsByCategory(): Record<SymptomCategory, SymptomDef[]> {
  const out = {} as Record<SymptomCategory, SymptomDef[]>
  for (const cat of SYMPTOM_CATEGORIES) out[cat] = []
  for (const s of SYMPTOMS) out[s.category].push(s)
  return out
}
