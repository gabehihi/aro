// 만성 질환 9종
export const DISEASE_IDS = [
  "HTN",
  "DM",
  "DL",
  "OB",
  "MASLD",
  "OP",
  "CKD",
  "HypoT",
  "HyperT",
] as const
export type DiseaseId = (typeof DISEASE_IDS)[number]

export interface DiseaseMeta {
  id: DiseaseId
  label: string
  shortLabel: string
  kcdCode: string
  kcdDescription: string
}

export const SYMPTOM_CATEGORIES = [
  "전신",
  "두경부",
  "호흡기",
  "복부",
  "소화기",
  "비뇨기",
] as const
export type SymptomCategory = (typeof SYMPTOM_CATEGORIES)[number]

export interface SymptomDef {
  id: string
  label: string
  category: SymptomCategory
  hpiTemplate: string
}

export type SymptomSign = "+" | "-"

export interface AcuteToggle {
  symptomId: string
  sign: SymptomSign
}

export interface AcuteObjectiveVitals {
  sbp: string
  dbp: string
  hr: string
  bt: string
}

export interface AcuteObjectiveState {
  vitals: AcuteObjectiveVitals
  appearance: "Acute ill-looking" | "Chronic ill-looking" | "Not so ill-looking"
  pi: "-" | "+" | "++" | "+++"
  pth: "-" | "+" | "++" | "+++"
  breath_base: "Clear" | "Coarse"
  breath_extra: "without" | "with crackle" | "with wheezing" | "with crackle & wheezing"
  abd_soft: "Soft" | "Rigid"
  abd_shape: "Flat" | "Obese" | "Distended"
  abd_bs: "normoactive" | "hypoactive" | "hyperactive"
  abd_td: "no" | "Td (+)"
  abd_td_location: string
  cvat: "Neg" | "Pos"
  cvat_detail: string
  extra: string
}

export interface AcuteAssessmentState {
  diagnosis: string
}

export interface AcutePlanState {
  antibiotics: boolean
  revisit: boolean
  hydration: boolean
  extra: string
}

export const CHRONIC_VITAL_KEYS = [
  "sbp",
  "dbp",
  "hr",
  "bt",
  "rr",
  "spo2",
  "bw",
  "bh",
  "waist",
] as const
export type ChronicVitalKey = (typeof CHRONIC_VITAL_KEYS)[number]

// 만성 - 활력 징후 입력 (문자열로 받아 숫자로 파싱)
export interface ChronicVitals {
  sbp: string
  dbp: string
  hr: string
  bt: string
  rr: string
  spo2: string
  bw: string
  bh: string
  waist: string
}

export const CHRONIC_LAB_KEYS = [
  "hba1c",
  "fbs",
  "ppg",
  "ldl",
  "hdl",
  "tg",
  "tc",
  "ast",
  "alt",
  "ggt",
  "cr",
  "bun",
  "acr",
  "tsh",
  "ft4",
  "vitd",
  "hb",
  "tscore_spine",
  "tscore_hip",
] as const
export type ChronicLabKey = (typeof CHRONIC_LAB_KEYS)[number]

// 만성 - 주요 검사치
export interface ChronicLabs {
  // DM
  hba1c: string
  fbs: string
  ppg: string
  // DL
  ldl: string
  hdl: string
  tg: string
  tc: string
  // MASLD
  ast: string
  alt: string
  ggt: string
  // CKD
  cr: string
  bun: string
  acr: string
  // Thyroid
  tsh: string
  ft4: string
  // Supplemental
  vitd: string
  hb: string
  // OP
  tscore_spine: string
  tscore_hip: string
}

export interface OtherLabInput {
  name: string
  value: string
  unit: string
}

export interface HTNForm {
  home_bp_measured: boolean
  home_sbp: string
  home_dbp: string
  has_orthostatic: boolean
  orthostatic_detail: string
  has_cardiovascular: boolean
  has_smoking: boolean
  has_family_history: boolean
}

export interface DMForm {
  home_glucose_measured: boolean
  home_fbs: string
  home_ppg: string
  has_hypo: boolean
  hypo_detail: string
  labs_date: string
  insulin_used: boolean
  insulin_basal: string
  insulin_basal_name: string
  insulin_meal_name: string
  insulin_am: string
  insulin_md: string
  insulin_pm: string
}

export interface DLForm {
  labs_date: string
  has_ascvd_history: boolean
  rf_smoking: boolean
  rf_family_history: boolean
  rf_hdl_low: boolean
  rf_htn: boolean
  rf_age: boolean
}

export interface OBForm {
  goal_weight: string
}

export interface MASLDForm {
  fib4: string
}

export interface OPForm {
  last_dexa_date: string
  calcium_intake_adequate: boolean
}

export interface CKDForm {
  labs_date: string
  etiology: string
  is_dialysis: boolean
}

export interface ThyroidForm {
  medication: string
}

export interface EducationFlags {
  chronic_mgmt: boolean
  diet: boolean
  exercise: boolean
  smoking_cessation: boolean
  alcohol_reduction: boolean
  regular_checkup: boolean
  extra: string
}

export interface ChronicState {
  selectedDiseases: DiseaseId[]
  vitals: ChronicVitals
  labs: ChronicLabs
  otherLabs: OtherLabInput[]
  htn: HTNForm
  dm: DMForm
  dl: DLForm
  ob: OBForm
  masld: MASLDForm
  op: OPForm
  ckd: CKDForm
  thyroid: ThyroidForm
  education: EducationFlags
  extraDiagnoses: string[]
  extraPlan: string
  additionalSubjective: string
}

export interface AcuteState {
  toggles: AcuteToggle[]
  ccSymptomId: string | null
  onset: string
  duration: string
  pattern: string
  additional: string
  objective: AcuteObjectiveState
  assessment: AcuteAssessmentState
  plan: AcutePlanState
}

export interface PatientContext {
  sex: "M" | "F" | null
  age: number | null
}

export const EMPTY_VITALS: ChronicVitals = {
  sbp: "",
  dbp: "",
  hr: "",
  bt: "",
  rr: "",
  spo2: "",
  bw: "",
  bh: "",
  waist: "",
}

export const EMPTY_LABS: ChronicLabs = {
  hba1c: "",
  fbs: "",
  ppg: "",
  ldl: "",
  hdl: "",
  tg: "",
  tc: "",
  ast: "",
  alt: "",
  ggt: "",
  cr: "",
  bun: "",
  acr: "",
  tsh: "",
  ft4: "",
  vitd: "",
  hb: "",
  tscore_spine: "",
  tscore_hip: "",
}

export const EMPTY_OTHER_LAB: OtherLabInput = {
  name: "",
  value: "",
  unit: "",
}

export const EMPTY_CHRONIC_STATE: ChronicState = {
  selectedDiseases: [],
  vitals: EMPTY_VITALS,
  labs: EMPTY_LABS,
  otherLabs: [],
  htn: {
    home_bp_measured: false,
    home_sbp: "",
    home_dbp: "",
    has_orthostatic: false,
    orthostatic_detail: "",
    has_cardiovascular: false,
    has_smoking: false,
    has_family_history: false,
  },
  dm: {
    home_glucose_measured: false,
    home_fbs: "",
    home_ppg: "",
    has_hypo: false,
    hypo_detail: "",
    labs_date: "",
    insulin_used: false,
    insulin_basal: "",
    insulin_basal_name: "",
    insulin_meal_name: "",
    insulin_am: "",
    insulin_md: "",
    insulin_pm: "",
  },
  dl: {
    labs_date: "",
    has_ascvd_history: false,
    rf_smoking: false,
    rf_family_history: false,
    rf_hdl_low: false,
    rf_htn: false,
    rf_age: false,
  },
  ob: { goal_weight: "" },
  masld: { fib4: "" },
  op: { last_dexa_date: "", calcium_intake_adequate: false },
  ckd: { labs_date: "", etiology: "", is_dialysis: false },
  thyroid: { medication: "" },
  education: {
    chronic_mgmt: false,
    diet: false,
    exercise: false,
    smoking_cessation: false,
    alcohol_reduction: false,
    regular_checkup: false,
    extra: "",
  },
  extraDiagnoses: [],
  extraPlan: "",
  additionalSubjective: "",
}

export const EMPTY_ACUTE_OBJECTIVE_VITALS: AcuteObjectiveVitals = {
  sbp: "",
  dbp: "",
  hr: "",
  bt: "",
}

export const EMPTY_ACUTE_OBJECTIVE: AcuteObjectiveState = {
  vitals: EMPTY_ACUTE_OBJECTIVE_VITALS,
  appearance: "Not so ill-looking",
  pi: "-",
  pth: "-",
  breath_base: "Clear",
  breath_extra: "without",
  abd_soft: "Soft",
  abd_shape: "Flat",
  abd_bs: "normoactive",
  abd_td: "no",
  abd_td_location: "",
  cvat: "Neg",
  cvat_detail: "",
  extra: "",
}

export const EMPTY_ACUTE_ASSESSMENT: AcuteAssessmentState = {
  diagnosis: "",
}

export const EMPTY_ACUTE_PLAN: AcutePlanState = {
  antibiotics: false,
  revisit: true,
  hydration: true,
  extra: "",
}

export const EMPTY_ACUTE_STATE: AcuteState = {
  toggles: [],
  ccSymptomId: null,
  onset: "",
  duration: "",
  pattern: "",
  additional: "",
  objective: EMPTY_ACUTE_OBJECTIVE,
  assessment: EMPTY_ACUTE_ASSESSMENT,
  plan: EMPTY_ACUTE_PLAN,
}
