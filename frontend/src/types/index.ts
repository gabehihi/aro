export type UserRole = "doctor" | "nurse" | "admin"

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  is_active: boolean
  clinic_name?: string | null
  clinic_address?: string | null
  clinic_phone?: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export type Sex = "M" | "F"
export type InsuranceType = "건강보험" | "의료급여1종" | "의료급여2종"
export type MessagingMethod = "kakao" | "sms" | "both"

export interface UserUpdatePayload {
  name?: string
  clinic_name?: string
  clinic_address?: string
  clinic_phone?: string
}

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
export type DrugRoute = "경구" | "주사" | "외용" | "흡입"
export type PrescribedBy = "보건소" | "타원"

export interface Vitals {
  sbp: number | null
  dbp: number | null
  hr: number | null
  bt: number | null
  rr: number | null
  spo2: number | null
  bw: number | null
  bh: number | null
  waist: number | null
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
  follow_up_alerts: ClinicalFollowUpAlert[]
}

export interface ClinicalFollowUpAlert {
  id: string
  alert_type: string
  item: string
  last_value: string | null
  last_date: string | null
  due_date: string
  days_overdue: number
  priority: "urgent" | "due" | "upcoming"
  resolved: boolean
}

export interface Prescription {
  id: string
  patient_id: string
  encounter_id: string | null
  drug_name: string | null
  drug_code: string | null
  ingredient_inn: string | null
  atc_code: string | null
  drugbank_id: string | null
  dose: string | null
  frequency: string | null
  duration_days: number | null
  route: DrugRoute | null
  is_active: boolean
  prescribed_by: PrescribedBy
  source_hospital: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface PrescriptionCreate {
  encounter_id?: string | null
  drug_name?: string
  drug_code?: string
  ingredient_inn?: string
  atc_code?: string
  drugbank_id?: string
  dose?: string
  frequency?: string
  duration_days?: number
  route?: DrugRoute
  prescribed_by?: PrescribedBy
  source_hospital?: string
  start_date?: string
  end_date?: string
  is_active?: boolean
}

export interface PrescriptionUpdate {
  drug_name?: string
  drug_code?: string
  ingredient_inn?: string
  atc_code?: string
  drugbank_id?: string
  dose?: string
  frequency?: string
  duration_days?: number
  route?: DrugRoute
  prescribed_by?: PrescribedBy
  source_hospital?: string
  start_date?: string
  end_date?: string
  is_active?: boolean
}

// --- Document Automation (Phase 2) ---

export type DocType =
  | "진단서"
  | "소견서"
  | "의뢰서"
  | "확인서"
  | "건강진단서"
  | "검사결과안내서"
  | "교육문서"
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

export interface RecentDocumentSummary {
  id: string
  patient_id: string
  patient_name: string
  chart_no: string
  doc_type: DocType
  title: string
  status: DocStatus
  created_at: string
  issued_at: string | null
}

export interface MonthlyReportStats {
  year: number
  month: number
  total_patients: number
  new_patients_this_month: number
  active_patients_this_month: number
  total_encounters: number
  encounters_this_month: number
  documents_issued_this_month: number
  followup_alerts_this_month: number
  followup_resolved_this_month: number
  followup_resolution_rate: number
  screenings_this_month: number
  abnormal_screenings: number
  abnormal_rate: number
}

export interface MonthlyReportArchiveItem {
  year: number
  month: number
  filename: string
  size_bytes: number
  generated_at: string
}

export interface MonthlyReportArchiveResponse {
  items: MonthlyReportArchiveItem[]
}

export interface DashboardOverviewResponse {
  summary: DashboardSummary
  month_stats: MonthlyReportStats
  upcoming_visits: VisitScheduleItem[]
  priority_followup_alerts: FollowUpAlertItem[]
  recent_documents: RecentDocumentSummary[]
  report_archive: MonthlyReportArchiveItem[]
}

// ============================================================
// Polypharmacy (Phase 3)
// ============================================================

export interface LabInput {
  name: string
  value: number
  unit?: string
  baseline?: number
}

export interface PolypharmacyReviewRequest {
  patient_id?: string
  drug_inns?: string[]
  egfr?: number
  crcl?: number
  clinical_flags?: string[]
  labs?: LabInput[]
}

export interface PolypharmacyPrefillData {
  age: number | null
  sex: string | null
  weight_kg: number | null
  height_cm: number | null
  serum_cr: number | null
  egfr: number | null
  crcl: number | null
}

export interface DDIFinding {
  drug_a: string
  drug_b: string
  severity: "CONTRAINDICATED" | "MAJOR" | "MODERATE" | "MINOR"
  mechanism: string
  management: string
  clinic_note: string | null
  ddi_id: string | null
}

export interface RenalRecommendation {
  drug_inn: string
  egfr: number | null
  crcl: number | null
  dosing_basis: "eGFR" | "CrCl"
  recommendation: "FULL_DOSE" | "REDUCE" | "AVOID" | "CONTRAINDICATED" | "NOT_IN_DB"
  detail: string
  max_daily_dose: string | null
  monitoring: string[]
  source: string | null
}

export interface PolypharmacySickDayAlert {
  drug_inn: string
  action: "HOLD" | "REDUCE" | "MONITOR"
  reason: string
  trigger_matched: string
  detail: string
}

export interface PolypharmacyWarning {
  type: string
  message: string
  severity: "error" | "warning"
}

export interface PolypharmacyReport {
  drug_inns: string[]
  egfr: number | null
  crcl: number | null
  ddi_findings: DDIFinding[]
  renal_recommendations: RenalRecommendation[]
  sick_day_alerts: PolypharmacySickDayAlert[]
  llm_summary: string
  llm_meta: LLMMeta
  warnings: PolypharmacyWarning[]
}

// ── Phase 4: Screening & Follow-up ───────────────────────────────

export interface AbnormalFinding {
  name: string
  value: string | number
  unit: string
  tier: "urgent" | "caution" | "normal"
  ref_range: string
  message: string
}

export interface ClassifyPreviewRequest {
  results: Record<string, string | number>
  patient_sex?: "M" | "F"
}

export interface ClassifyPreviewResponse {
  findings: AbnormalFinding[]
  urgent_count: number
  caution_count: number
  normal_count: number
}

export interface ScreeningResultCreate {
  patient_id: string
  screening_type: "국가건강검진" | "암검진" | "생애전환기"
  screening_date: string   // "YYYY-MM-DD"
  results: Record<string, string | number>
  patient_has_dm?: boolean
}

export interface ScreeningResultResponse {
  id: string
  patient_id: string
  screening_type: string
  screening_date: string
  results: Record<string, string | number>
  abnormal_findings: AbnormalFinding[]
  follow_up_required: boolean
  created_at: string
}

export interface FollowUpAlertItem {
  id: string
  patient_id: string
  patient_name: string
  chart_no: string
  alert_type: string
  item: string
  last_value: string | null
  last_date: string | null
  due_date: string
  days_overdue: number
  priority: "urgent" | "due" | "upcoming"
  resolved: boolean
}

export interface DashboardSummary {
  today_appointments: number
  followup_needed: number
  noshow_last_week: number
  screening_incomplete: number
}

export interface DashboardResponse {
  summary: DashboardSummary
  followup_alerts: FollowUpAlertItem[]
  noshow_patients: Array<{
    patient_id: string
    patient_name: string
    chart_no: string
    scheduled_date: string
    planned_tests: string[]
  }>
}

// ── Phase 5: Visit Schedules ──────────────────────────────────────

export interface VisitScheduleCreate {
  patient_id: string
  scheduled_date: string   // "YYYY-MM-DD"
  planned_tests?: string[]
  needs_fasting?: boolean
  special_instructions?: string[]
}

export interface VisitScheduleUpdate {
  scheduled_date?: string
  planned_tests?: string[]
  needs_fasting?: boolean
  special_instructions?: string[]
  visit_completed?: boolean
  reminder_status?: Record<string, unknown>
}

export interface VisitScheduleItem {
  id: string
  patient_id: string
  patient_name: string
  chart_no: string
  scheduled_date: string
  planned_tests: string[]
  needs_fasting: boolean
  special_instructions: string[]
  reminder_status: Record<string, unknown>
  visit_completed: boolean
  created_at: string
}
