import type { SymptomCategory, SymptomDef } from "./types"
import { SYMPTOM_CATEGORIES } from "./types"

export const SYMPTOMS: SymptomDef[] = [
  // 전신
  { id: "fever", label: "Fever", category: "전신", hpiTemplate: "{onset} 시작된 발열이 {duration} 지속됨." },
  { id: "chill", label: "Chills", category: "전신", hpiTemplate: "{onset}부터 오한 동반됨." },
  { id: "myalgia", label: "Myalgia", category: "전신", hpiTemplate: "{onset}부터 전신 근육통 호소함." },
  { id: "fatigue", label: "Fatigue", category: "전신", hpiTemplate: "{onset}부터 피곤감 지속됨." },
  { id: "weight_change", label: "Wt. change", category: "전신", hpiTemplate: "최근 체중 변화 호소함." },

  // 두경부
  { id: "headache", label: "Headache", category: "두경부", hpiTemplate: "{onset} 시작된 두통이 {duration} 지속됨." },
  { id: "dizziness", label: "Dizziness", category: "두경부", hpiTemplate: "{onset}부터 어지럼 호소함." },
  { id: "sore_throat", label: "Sore throat", category: "두경부", hpiTemplate: "{onset}부터 인후통 지속됨." },
  { id: "hoarseness", label: "Hoarseness", category: "두경부", hpiTemplate: "{onset}부터 쉰 목소리 동반됨." },

  // 호흡기
  { id: "cough", label: "Cough", category: "호흡기", hpiTemplate: "{onset} 시작된 기침이 {duration} 관찰됨." },
  { id: "sputum", label: "Sputum", category: "호흡기", hpiTemplate: "{onset}부터 가래 동반됨." },
  { id: "rhinorrhea", label: "Rhinorrhea", category: "호흡기", hpiTemplate: "{onset}부터 콧물 호소함." },
  { id: "nasal_obstruction", label: "Nasal obst.", category: "호흡기", hpiTemplate: "{onset}부터 코막힘 호소함." },
  { id: "dyspnea", label: "Dyspnea", category: "호흡기", hpiTemplate: "{onset}부터 호흡곤란 호소함." },
  { id: "chest_pain", label: "Chest pain", category: "호흡기", hpiTemplate: "{onset}부터 흉통 호소함." },

  // 복부
  { id: "abd_pain", label: "Abd. pain", category: "복부", hpiTemplate: "{onset} 시작된 복통이 {duration} 지속됨." },
  { id: "flank_pain", label: "Flank pain", category: "복부", hpiTemplate: "{onset}부터 옆구리 통증 호소함." },

  // 소화기
  { id: "anorexia", label: "Anorexia", category: "소화기", hpiTemplate: "{onset}부터 식욕저하 호소함." },
  { id: "nausea", label: "Nausea", category: "소화기", hpiTemplate: "{onset}부터 구역 호소함." },
  { id: "vomiting", label: "Vomiting", category: "소화기", hpiTemplate: "{onset}부터 구토 동반됨." },
  { id: "constipation", label: "Constipation", category: "소화기", hpiTemplate: "{onset}부터 변비 호소함." },
  { id: "diarrhea", label: "Diarrhea", category: "소화기", hpiTemplate: "{onset}부터 설사 지속됨." },

  // 비뇨기
  { id: "frequency", label: "Frequency", category: "비뇨기", hpiTemplate: "{onset}부터 빈뇨 호소함." },
  { id: "urgency", label: "Urgency", category: "비뇨기", hpiTemplate: "{onset}부터 요절박 호소함." },
  { id: "nocturia", label: "Nocturia", category: "비뇨기", hpiTemplate: "{onset}부터 야간뇨 호소함." },
  { id: "dysuria", label: "Dysuria", category: "비뇨기", hpiTemplate: "{onset}부터 배뇨통 호소함." },
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
