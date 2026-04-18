import { useMemo } from "react"
import { useShallow } from "zustand/shallow"
import { useSoapStore } from "./useSoapStore"
import { DISEASES } from "@/utils/soap/diseases"
import { composeSoap } from "@/utils/soap/soapFormatter"
import type { PatientContext } from "@/utils/soap/types"

function birthYearAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age
}

export function toPatientContext(
  patient: ReturnType<typeof useSoapStore.getState>["selectedPatient"],
): PatientContext {
  if (!patient) return { sex: null, age: null }
  const sex = patient.sex === "M" || patient.sex === "F" ? patient.sex : null
  return { sex, age: birthYearAge(patient.birth_date) }
}

export function useComposedSoap() {
  return useSoapStore(
    useShallow((state) => {
      const patient = toPatientContext(state.selectedPatient)
      return composeSoap(state.chronic, state.acute, patient, state.manualOverrides)
    }),
  )
}

export function useKCDCodesForSave() {
  // selectedDiseases is a stable array reference from the store (only changes on toggleDisease)
  const selectedDiseases = useSoapStore((s) => s.chronic.selectedDiseases)
  return useMemo(
    () =>
      selectedDiseases.map((id) => ({
        code: DISEASES[id].kcdCode,
        description: DISEASES[id].kcdDescription,
      })),
    [selectedDiseases],
  )
}

export function usePatientContext(): PatientContext {
  const patient = useSoapStore((state) => state.selectedPatient)
  return useMemo(() => toPatientContext(patient), [patient])
}
