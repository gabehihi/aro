export type UserRole = "doctor" | "nurse" | "admin"

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export type Sex = "M" | "F"
export type InsuranceType = "건강보험" | "의료급여" | "산재" | "자동차보험" | "비급여"
export type MessagingMethod = "kakao" | "sms"

export interface Patient {
  id: string
  chart_no: string
  name: string
  birth_date: string
  sex: Sex
  phone: string | null
  address: string | null
  insurance_type: InsuranceType
  chronic_diseases: string[]
  allergies: string[]
  memo: string | null
  messaging_consent: boolean
  messaging_method: MessagingMethod | null
  created_at: string
  updated_at: string
}

export interface PatientCreate {
  chart_no: string
  name: string
  birth_date: string
  sex: Sex
  phone?: string
  address?: string
  insurance_type: InsuranceType
  chronic_diseases?: string[]
  allergies?: string[]
  memo?: string
  messaging_consent?: boolean
  messaging_method?: MessagingMethod
}

export interface PatientUpdate {
  name?: string
  phone?: string
  address?: string
  insurance_type?: InsuranceType
  chronic_diseases?: string[]
  allergies?: string[]
  memo?: string
  messaging_consent?: boolean
  messaging_method?: MessagingMethod
}

export interface PatientListResponse {
  items: Patient[]
  total: number
  page: number
  size: number
}

export type VisitType = "초진" | "재진" | "건강상담"

export interface Vitals {
  sbp: number | null
  dbp: number | null
  hr: number | null
  bt: number | null
  rr: number | null
  spo2: number | null
  bw: number | null
  bh: number | null
  bmi: number | null
}

export interface KCDCode {
  code: string
  description: string
}

export interface Lab {
  name: string
  value: number | null
  unit: string
  flag: string | null
}

export interface HealthPromotion {
  smoking_cessation: boolean
  alcohol_reduction: boolean
  exercise: boolean
  diet: boolean
}

export interface SickDayAlert {
  drug_name: string
  ingredient: string
  action: "HOLD" | "REDUCE" | "MONITOR"
  reason: string
  triggering_keyword: string
}

export interface Warning {
  type: string
  message: string
  severity: "error" | "warning"
  location?: string
}

export interface LLMMeta {
  model: string
  latency_ms: number
  cost_usd: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
}

export interface SOAPRequest {
  patient_id: string
  raw_input: string
  visit_type: VisitType
}

export interface SOAPResponse {
  subjective: string
  objective: string
  assessment: string
  plan: string
  vitals: Vitals
  kcd_codes: KCDCode[]
  labs: Lab[]
  health_promotion: HealthPromotion
  unresolved_abbreviations: string[]
  warnings: Warning[]
  sick_day_alerts: SickDayAlert[]
  llm_meta: LLMMeta
}

export interface EncounterCreate {
  patient_id: string
  raw_input: string
  visit_type: VisitType
  encounter_date: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  vitals: Vitals | null
  kcd_codes: KCDCode[]
  labs: Lab[]
  health_promotion: HealthPromotion | null
  referral_flag?: boolean
  next_visit_date?: string
  next_visit_tests?: string[]
  next_visit_fasting?: boolean
}

export interface Encounter {
  id: string
  patient_id: string
  encounter_date: string
  raw_input: string
  visit_type: VisitType
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  vitals: Vitals | null
  kcd_codes: KCDCode[]
  labs: Lab[]
  health_promotion: HealthPromotion | null
  referral_flag: boolean
  external_referral_note: string | null
  next_visit_date: string | null
  next_visit_tests: string[]
  next_visit_fasting: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface EncounterListResponse {
  items: Encounter[]
  total: number
  page: number
  size: number
}

export interface ClinicalSummary {
  patient_id: string
  recent_vitals: Record<string, unknown>[]
  recent_labs: Record<string, unknown>[]
  recent_encounters: Record<string, unknown>[]
  follow_up_alerts: Record<string, unknown>[]
}

// --- Document Automation (Phase 2) ---

export type DocType = "진단서" | "소견서" | "의뢰서" | "확인서" | "건강진단서"
export type DocStatus = "draft" | "reviewed" | "issued"

export interface DocumentGenerateRequest {
  patient_id: string
  encounter_id?: string | null
  doc_type: DocType
}

export interface DocumentGenerateResponse {
  generated_text: string
  content: Record<string, unknown>
  source_data: Record<string, unknown>
  warnings: Warning[]
  has_unresolved_errors: boolean
  llm_meta: LLMMeta
}

export interface DocumentSaveRequest {
  patient_id: string
  encounter_id?: string | null
  doc_type: DocType
  title: string
  content: Record<string, unknown>
  generated_text: string
}

export interface DocumentUpdateRequest {
  generated_text?: string
  content?: Record<string, unknown>
  status?: DocStatus
}

export interface MedicalDocument {
  id: string
  patient_id: string
  encounter_id: string | null
  doc_type: DocType
  title: string
  content: Record<string, unknown>
  generated_text: string | null
  file_path: string | null
  status: DocStatus
  created_by: string
  issued_at: string | null
  created_at: string
  updated_at: string
}

export interface DocumentListResponse {
  items: MedicalDocument[]
  total: number
  page: number
  size: number
}
