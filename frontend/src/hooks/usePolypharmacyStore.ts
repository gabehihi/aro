import { create } from "zustand"
import type { LabInput, Patient, PolypharmacyReport } from "@/types"

interface PolypharmacyState {
  // State
  selectedPatient: Patient | null
  drugInns: string[]
  egfr: string
  clinicalFlags: string[]
  labs: LabInput[]
  report: PolypharmacyReport | null
  isReviewing: boolean
  error: string | null

  // Actions
  setSelectedPatient: (patient: Patient | null) => void
  setDrugInns: (inns: string[]) => void
  addDrugInn: (inn: string) => void
  removeDrugInn: (inn: string) => void
  setEgfr: (v: string) => void
  toggleClinicalFlag: (flag: string) => void
  setReport: (r: PolypharmacyReport | null) => void
  setIsReviewing: (v: boolean) => void
  setError: (e: string | null) => void
  clearReport: () => void
  reset: () => void
}

const initialState = {
  selectedPatient: null as Patient | null,
  drugInns: [] as string[],
  egfr: "",
  clinicalFlags: [] as string[],
  labs: [] as LabInput[],
  report: null as PolypharmacyReport | null,
  isReviewing: false,
  error: null as string | null,
}

export const usePolypharmacyStore = create<PolypharmacyState>((set) => ({
  ...initialState,

  setSelectedPatient: (patient) =>
    set({ selectedPatient: patient, report: null, drugInns: [], error: null }),

  setDrugInns: (inns) => set({ drugInns: inns }),

  addDrugInn: (inn) =>
    set((state) => ({
      drugInns: state.drugInns.includes(inn.toLowerCase())
        ? state.drugInns
        : [...state.drugInns, inn.toLowerCase()],
    })),

  removeDrugInn: (inn) =>
    set((state) => ({ drugInns: state.drugInns.filter((d) => d !== inn) })),

  setEgfr: (v) => set({ egfr: v }),

  toggleClinicalFlag: (flag) =>
    set((state) => ({
      clinicalFlags: state.clinicalFlags.includes(flag)
        ? state.clinicalFlags.filter((f) => f !== flag)
        : [...state.clinicalFlags, flag],
    })),

  setReport: (r) => set({ report: r }),
  setIsReviewing: (v) => set({ isReviewing: v }),
  setError: (e) => set({ error: e }),
  clearReport: () => set({ report: null, error: null }),
  reset: () => set(initialState),
}))
