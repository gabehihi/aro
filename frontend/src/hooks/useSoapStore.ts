import { create } from "zustand"
import type { Patient, SOAPResponse, VisitType } from "@/types"

interface SoapState {
  selectedPatient: Patient | null
  rawInput: string
  visitType: VisitType
  soapResult: SOAPResponse | null
  isConverting: boolean
  isSaving: boolean
  error: string | null

  setSelectedPatient: (patient: Patient | null) => void
  setRawInput: (input: string) => void
  setVisitType: (type: VisitType) => void
  setSoapResult: (result: SOAPResponse | null) => void
  setIsConverting: (loading: boolean) => void
  setIsSaving: (loading: boolean) => void
  setError: (error: string | null) => void
  updateSoapField: (field: keyof Pick<SOAPResponse, "subjective" | "objective" | "assessment" | "plan">, value: string) => void
  reset: () => void
}

const initialState = {
  selectedPatient: null,
  rawInput: "",
  visitType: "재진" as VisitType,
  soapResult: null,
  isConverting: false,
  isSaving: false,
  error: null,
}

export const useSoapStore = create<SoapState>((set) => ({
  ...initialState,

  setSelectedPatient: (patient) => set({ selectedPatient: patient, soapResult: null, error: null }),
  setRawInput: (input) => set({ rawInput: input }),
  setVisitType: (type) => set({ visitType: type }),
  setSoapResult: (result) => set({ soapResult: result }),
  setIsConverting: (loading) => set({ isConverting: loading }),
  setIsSaving: (loading) => set({ isSaving: loading }),
  setError: (error) => set({ error }),
  updateSoapField: (field, value) =>
    set((state) => {
      if (!state.soapResult) return state
      return { soapResult: { ...state.soapResult, [field]: value } }
    }),
  reset: () => set(initialState),
}))
