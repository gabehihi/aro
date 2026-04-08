import { create } from "zustand"
import type {
  Patient,
  Encounter,
  DocType,
  DocumentGenerateResponse,
} from "@/types"

interface DocumentState {
  selectedPatient: Patient | null
  selectedEncounter: Encounter | null
  docType: DocType | null
  sourceData: Record<string, unknown> | null
  generatedResult: DocumentGenerateResponse | null
  editedText: string
  isGenerating: boolean
  isSaving: boolean
  isIssuing: boolean
  error: string | null

  setSelectedPatient: (patient: Patient | null) => void
  setSelectedEncounter: (encounter: Encounter | null) => void
  setDocType: (docType: DocType | null) => void
  setSourceData: (data: Record<string, unknown> | null) => void
  setGeneratedResult: (result: DocumentGenerateResponse | null) => void
  setEditedText: (text: string) => void
  setIsGenerating: (loading: boolean) => void
  setIsSaving: (loading: boolean) => void
  setIsIssuing: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  selectedPatient: null,
  selectedEncounter: null,
  docType: null as DocType | null,
  sourceData: null,
  generatedResult: null,
  editedText: "",
  isGenerating: false,
  isSaving: false,
  isIssuing: false,
  error: null,
}

export const useDocumentStore = create<DocumentState>((set) => ({
  ...initialState,

  setSelectedPatient: (patient) =>
    set({ selectedPatient: patient, generatedResult: null, error: null }),
  setSelectedEncounter: (encounter) => set({ selectedEncounter: encounter }),
  setDocType: (docType) =>
    set({ docType, generatedResult: null, error: null }),
  setSourceData: (data) => set({ sourceData: data }),
  setGeneratedResult: (result) =>
    set({
      generatedResult: result,
      editedText: result?.generated_text ?? "",
    }),
  setEditedText: (text) => set({ editedText: text }),
  setIsGenerating: (loading) => set({ isGenerating: loading }),
  setIsSaving: (loading) => set({ isSaving: loading }),
  setIsIssuing: (loading) => set({ isIssuing: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
