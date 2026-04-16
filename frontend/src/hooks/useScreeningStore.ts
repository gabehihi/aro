import { create } from "zustand"
import type {
  AbnormalFinding,
  ScreeningResultResponse,
  DashboardResponse,
} from "@/types"

type ActiveTab = "entry" | "dashboard"

interface ScreeningState {
  // Entry state
  selectedPatientId: string | null
  screeningType: "국가건강검진" | "암검진" | "생애전환기"
  screeningDate: string
  resultsInput: string
  patientHasDm: boolean
  patientSex: "M" | "F"

  // Preview state
  previewFindings: AbnormalFinding[]
  isClassifying: boolean

  // Save state
  savedResult: ScreeningResultResponse | null
  isSaving: boolean

  // Dashboard state
  dashboard: DashboardResponse | null
  isDashboardLoading: boolean

  // UI
  activeTab: ActiveTab
  error: string | null

  // Actions
  setSelectedPatientId: (id: string | null) => void
  setScreeningType: (t: ScreeningState["screeningType"]) => void
  setScreeningDate: (d: string) => void
  setResultsInput: (v: string) => void
  setPatientHasDm: (v: boolean) => void
  setPatientSex: (s: "M" | "F") => void
  setPreviewFindings: (f: AbnormalFinding[]) => void
  setIsClassifying: (v: boolean) => void
  setSavedResult: (r: ScreeningResultResponse | null) => void
  setIsSaving: (v: boolean) => void
  setDashboard: (d: DashboardResponse | null) => void
  setIsDashboardLoading: (v: boolean) => void
  setActiveTab: (t: ActiveTab) => void
  setError: (e: string | null) => void
  resetEntry: () => void
}

const initialEntryState = {
  selectedPatientId: null,
  screeningType: "국가건강검진" as const,
  screeningDate: new Date().toISOString().slice(0, 10),
  resultsInput: "",
  patientHasDm: false,
  patientSex: "M" as const,
  previewFindings: [],
  isClassifying: false,
  savedResult: null,
  isSaving: false,
  error: null,
}

export const useScreeningStore = create<ScreeningState>((set) => ({
  ...initialEntryState,
  dashboard: null,
  isDashboardLoading: false,
  activeTab: "dashboard",

  setSelectedPatientId: (id) => set({ selectedPatientId: id }),
  setScreeningType: (t) => set({ screeningType: t }),
  setScreeningDate: (d) => set({ screeningDate: d }),
  setResultsInput: (v) => set({ resultsInput: v }),
  setPatientHasDm: (v) => set({ patientHasDm: v }),
  setPatientSex: (s) => set({ patientSex: s }),
  setPreviewFindings: (f) => set({ previewFindings: f }),
  setIsClassifying: (v) => set({ isClassifying: v }),
  setSavedResult: (r) => set({ savedResult: r }),
  setIsSaving: (v) => set({ isSaving: v }),
  setDashboard: (d) => set({ dashboard: d }),
  setIsDashboardLoading: (v) => set({ isDashboardLoading: v }),
  setActiveTab: (t) => set({ activeTab: t }),
  setError: (e) => set({ error: e }),
  resetEntry: () => set(initialEntryState),
}))
