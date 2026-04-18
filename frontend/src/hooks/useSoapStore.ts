import { create } from "zustand"
import type { Patient, VisitType } from "@/types"
import type {
  AcuteState,
  ChronicState,
  ChronicLabKey,
  ChronicVitalKey,
  DiseaseId,
  OtherLabInput,
} from "@/utils/soap/types"
import {
  CHRONIC_LAB_KEYS,
  CHRONIC_VITAL_KEYS,
  EMPTY_ACUTE_STATE,
  EMPTY_CHRONIC_STATE,
  EMPTY_LABS,
  EMPTY_OTHER_LAB,
  EMPTY_VITALS,
} from "@/utils/soap/types"
import { DISEASE_ORDER } from "@/utils/soap/diseases"

export type SoapMode = "chronic" | "acute"
export type SoapSectionKey = "s" | "o" | "a" | "p"
export type ManualOverrides = Partial<Record<SoapSectionKey, string>>
type AcuteObjectivePatch = Partial<Omit<AcuteState["objective"], "vitals">> & {
  vitals?: Partial<AcuteState["objective"]["vitals"]>
}
type PrefillOtherLab = {
  name: string
  value: string | number | null
  unit: string
}

interface SoapState {
  mode: SoapMode
  selectedPatient: Patient | null
  visitType: VisitType
  activeChronicDisease: DiseaseId | null
  chronic: ChronicState
  acute: AcuteState
  manualOverrides: ManualOverrides
  hasUserEdits: boolean
  isSaving: boolean
  isPrefilling: boolean
  error: string | null
  lastEncounterDate: string | null

  setMode: (mode: SoapMode) => void
  setSelectedPatient: (patient: Patient | null) => void
  setVisitType: (type: VisitType) => void
  setActiveChronicDisease: (id: DiseaseId | null) => void

  setChronic: (update: Partial<ChronicState>) => void
  toggleDisease: (id: DiseaseId) => void
  updateChronicVitals: (patch: Partial<ChronicState["vitals"]>) => void
  updateChronicLabs: (patch: Partial<ChronicState["labs"]>) => void
  addOtherLab: () => void
  updateOtherLab: (index: number, patch: Partial<OtherLabInput>) => void
  removeOtherLab: (index: number) => void
  updateChronicForm: <K extends keyof ChronicState>(
    key: K,
    patch: Partial<ChronicState[K]>,
  ) => void

  setAcute: (update: Partial<AcuteState>) => void
  updateAcuteObjective: (patch: AcuteObjectivePatch) => void
  updateAcuteAssessment: (patch: Partial<AcuteState["assessment"]>) => void
  updateAcutePlan: (patch: Partial<AcuteState["plan"]>) => void
  toggleSymptom: (symptomId: string, sign: "+" | "-") => void
  clearSymptom: (symptomId: string) => void
  setCC: (symptomId: string | null) => void

  setManualOverride: (section: SoapSectionKey, value: string) => void
  clearManualOverride: (section: SoapSectionKey) => void
  clearAllOverrides: () => void

  setIsSaving: (saving: boolean) => void
  setIsPrefilling: (loading: boolean) => void
  setError: (error: string | null) => void
  setLastEncounterDate: (date: string | null) => void

  applyPrefill: (patch: {
    selected_diseases: DiseaseId[]
    chronic_vs: Record<string, unknown>
    labs_by_name: Record<string, unknown>
    ckd_form: {
      labs_date: string
    }
    other_labs: PrefillOtherLab[]
    education_flags: Partial<ChronicState["education"]>
    last_encounter_date: string | null
  }) => void

  reset: () => void
  resetForNewPatient: () => void
}

const initialState: Pick<
  SoapState,
  | "mode"
  | "selectedPatient"
  | "visitType"
  | "activeChronicDisease"
  | "chronic"
  | "acute"
  | "manualOverrides"
  | "hasUserEdits"
  | "isSaving"
  | "isPrefilling"
  | "error"
  | "lastEncounterDate"
> = {
  mode: "chronic",
  selectedPatient: null,
  visitType: "재진",
  activeChronicDisease: null,
  chronic: EMPTY_CHRONIC_STATE,
  acute: EMPTY_ACUTE_STATE,
  manualOverrides: {},
  hasUserEdits: false,
  isSaving: false,
  isPrefilling: false,
  error: null,
  lastEncounterDate: null,
}

function toVitalString(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : ""
  if (typeof value === "string") return value
  return ""
}

function isChronicVitalKey(key: string): key is ChronicVitalKey {
  return CHRONIC_VITAL_KEYS.includes(key as ChronicVitalKey)
}

function isChronicLabKey(key: string): key is ChronicLabKey {
  return CHRONIC_LAB_KEYS.includes(key as ChronicLabKey)
}

function getFirstSelectedDisease(selected: DiseaseId[]): DiseaseId | null {
  return DISEASE_ORDER.find((id) => selected.includes(id)) ?? null
}

function syncActiveChronicDisease(
  active: DiseaseId | null,
  selected: DiseaseId[],
): DiseaseId | null {
  if (active && selected.includes(active)) return active
  return getFirstSelectedDisease(selected)
}

export const useSoapStore = create<SoapState>((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),
  setSelectedPatient: (patient) =>
    set({
      selectedPatient: patient,
      activeChronicDisease: null,
      chronic: EMPTY_CHRONIC_STATE,
      acute: EMPTY_ACUTE_STATE,
      manualOverrides: {},
      hasUserEdits: false,
      error: null,
      lastEncounterDate: null,
    }),
  setVisitType: (type) => set({ visitType: type }),
  setActiveChronicDisease: (id) => set({ activeChronicDisease: id }),

  setChronic: (update) =>
    set((state) => {
      const chronic = { ...state.chronic, ...update }
      return {
        chronic,
        activeChronicDisease: syncActiveChronicDisease(
          state.activeChronicDisease,
          chronic.selectedDiseases,
        ),
        hasUserEdits: true,
      }
    }),

  toggleDisease: (id) =>
    set((state) => {
      const selected = state.chronic.selectedDiseases
      const has = selected.includes(id)
      let next: DiseaseId[]
      let activeChronicDisease: DiseaseId | null
      if (has) {
        next = selected.filter((d) => d !== id)
        activeChronicDisease =
          state.activeChronicDisease === id
            ? getFirstSelectedDisease(next)
            : syncActiveChronicDisease(state.activeChronicDisease, next)
      } else {
        // 갑상선 배타
        if (id === "HypoT") {
          next = [...selected.filter((d) => d !== "HyperT"), id]
        } else if (id === "HyperT") {
          next = [...selected.filter((d) => d !== "HypoT"), id]
        } else {
          next = [...selected, id]
        }
        activeChronicDisease = id
      }
      return {
        chronic: { ...state.chronic, selectedDiseases: next },
        activeChronicDisease,
        hasUserEdits: true,
      }
    }),

  updateChronicVitals: (patch) =>
    set((state) => ({
      chronic: { ...state.chronic, vitals: { ...state.chronic.vitals, ...patch } },
      hasUserEdits: true,
    })),

  updateChronicLabs: (patch) =>
    set((state) => ({
      chronic: { ...state.chronic, labs: { ...state.chronic.labs, ...patch } },
      hasUserEdits: true,
    })),

  addOtherLab: () =>
    set((state) => ({
      chronic: {
        ...state.chronic,
        otherLabs: [...state.chronic.otherLabs, { ...EMPTY_OTHER_LAB }],
      },
      hasUserEdits: true,
    })),

  updateOtherLab: (index, patch) =>
    set((state) => ({
      chronic: {
        ...state.chronic,
        otherLabs: state.chronic.otherLabs.map((lab, labIndex) =>
          labIndex === index ? { ...lab, ...patch } : lab,
        ),
      },
      hasUserEdits: true,
    })),

  removeOtherLab: (index) =>
    set((state) => ({
      chronic: {
        ...state.chronic,
        otherLabs: state.chronic.otherLabs.filter((_, labIndex) => labIndex !== index),
      },
      hasUserEdits: true,
    })),

  updateChronicForm: (key, patch) =>
    set((state) => {
      const current = state.chronic[key]
      if (typeof current !== "object" || current === null) return state
      return {
        chronic: {
          ...state.chronic,
          [key]: { ...(current as object), ...(patch as object) },
        },
        hasUserEdits: true,
      }
    }),

  setAcute: (update) =>
    set((state) => ({
      acute: { ...state.acute, ...update },
      hasUserEdits: true,
    })),

  updateAcuteObjective: (patch) =>
    set((state) => ({
      acute: {
        ...state.acute,
        objective: {
          ...state.acute.objective,
          ...patch,
          vitals: patch.vitals
            ? { ...state.acute.objective.vitals, ...patch.vitals }
            : state.acute.objective.vitals,
        },
      },
      hasUserEdits: true,
    })),

  updateAcuteAssessment: (patch) =>
    set((state) => ({
      acute: {
        ...state.acute,
        assessment: { ...state.acute.assessment, ...patch },
      },
      hasUserEdits: true,
    })),

  updateAcutePlan: (patch) =>
    set((state) => ({
      acute: {
        ...state.acute,
        plan: { ...state.acute.plan, ...patch },
      },
      hasUserEdits: true,
    })),

  toggleSymptom: (symptomId, sign) =>
    set((state) => {
      const existing = state.acute.toggles.find((t) => t.symptomId === symptomId)
      let toggles = state.acute.toggles
      if (!existing) {
        toggles = [...toggles, { symptomId, sign }]
      } else if (existing.sign === sign) {
        // same click → clear
        toggles = toggles.filter((t) => t.symptomId !== symptomId)
      } else {
        toggles = toggles.map((t) =>
          t.symptomId === symptomId ? { ...t, sign } : t,
        )
      }
      // CC가 해제된 증상이면 CC 도 해제
      const ccSymptomId =
        state.acute.ccSymptomId &&
        !toggles.some((t) => t.symptomId === state.acute.ccSymptomId)
          ? null
          : state.acute.ccSymptomId
      return {
        acute: { ...state.acute, toggles, ccSymptomId },
        hasUserEdits: true,
      }
    }),

  clearSymptom: (symptomId) =>
    set((state) => {
      const toggles = state.acute.toggles.filter((t) => t.symptomId !== symptomId)
      const ccSymptomId =
        state.acute.ccSymptomId === symptomId ? null : state.acute.ccSymptomId
      return {
        acute: { ...state.acute, toggles, ccSymptomId },
        hasUserEdits: true,
      }
    }),

  setCC: (symptomId) =>
    set((state) => ({
      acute: { ...state.acute, ccSymptomId: symptomId },
      hasUserEdits: true,
    })),

  setManualOverride: (section, value) =>
    set((state) => ({
      manualOverrides: { ...state.manualOverrides, [section]: value },
      hasUserEdits: true,
    })),

  clearManualOverride: (section) =>
    set((state) => {
      const next = { ...state.manualOverrides }
      delete next[section]
      return { manualOverrides: next, hasUserEdits: state.hasUserEdits }
    }),

  clearAllOverrides: () =>
    set((state) => ({ manualOverrides: {}, hasUserEdits: state.hasUserEdits })),

  setIsSaving: (saving) => set({ isSaving: saving }),
  setIsPrefilling: (loading) => set({ isPrefilling: loading }),
  setError: (error) => set({ error }),
  setLastEncounterDate: (date) => set({ lastEncounterDate: date }),

  applyPrefill: (patch) =>
    set((state) => {
      const vitalsPatch: Partial<ChronicState["vitals"]> = {}
      for (const [k, v] of Object.entries(patch.chronic_vs)) {
        if (!isChronicVitalKey(k)) continue
        vitalsPatch[k] = toVitalString(v)
      }
      const labsPatch: Partial<ChronicState["labs"]> = {}
      for (const [k, v] of Object.entries(patch.labs_by_name)) {
        if (!isChronicLabKey(k)) continue
        labsPatch[k] = toVitalString(v)
      }
      return {
        chronic: {
          ...state.chronic,
          selectedDiseases: patch.selected_diseases,
          vitals: { ...EMPTY_VITALS, ...vitalsPatch },
          labs: { ...EMPTY_LABS, ...labsPatch },
          ckd: {
            ...state.chronic.ckd,
            labs_date: patch.ckd_form.labs_date,
          },
          otherLabs: patch.other_labs
            .filter((lab) => lab.name.trim().length > 0)
            .map((lab) => ({
              name: lab.name,
              value: toVitalString(lab.value),
              unit: lab.unit,
            })),
          education: {
            ...state.chronic.education,
            smoking_cessation: false,
            alcohol_reduction: false,
            exercise: false,
            diet: false,
            ...patch.education_flags,
          },
        },
        activeChronicDisease: getFirstSelectedDisease(patch.selected_diseases),
        hasUserEdits: false,
        lastEncounterDate: patch.last_encounter_date,
      }
    }),

  reset: () => set(initialState),
  resetForNewPatient: () =>
    set({
      activeChronicDisease: null,
      chronic: EMPTY_CHRONIC_STATE,
      acute: EMPTY_ACUTE_STATE,
      manualOverrides: {},
      hasUserEdits: false,
      error: null,
    }),
}))
