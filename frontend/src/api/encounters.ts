import api from "@/lib/api"
import type {
  Encounter,
  EncounterCreate,
  EncounterListResponse,
} from "@/types"

export interface SoapPrefillLab {
  name: string
  value: number | null
  unit: string
  flag: string | null
  measured_at: string
}

export interface SoapPrefillResponse {
  selected_diseases: string[]
  chronic_vs: Record<string, number | null>
  labs_by_name: Record<string, SoapPrefillLab>
  other_labs: SoapPrefillLab[]
  education_flags: {
    smoking_cessation: boolean
    alcohol_reduction: boolean
    exercise: boolean
    diet: boolean
  }
  last_encounter_date: string | null
}

export async function saveEncounter(body: EncounterCreate): Promise<Encounter> {
  const { data } = await api.post<Encounter>("/encounters", body)
  return data
}

export async function getEncounters(
  patientId: string,
  page = 1,
  size = 20,
): Promise<EncounterListResponse> {
  const { data } = await api.get<EncounterListResponse>("/encounters", {
    params: { patient_id: patientId, page, size },
  })
  return data
}

export async function getEncounter(id: string): Promise<Encounter> {
  const { data } = await api.get<Encounter>(`/encounters/${id}`)
  return data
}

export async function getSoapPrefill(
  patientId: string,
): Promise<SoapPrefillResponse> {
  const { data } = await api.get<SoapPrefillResponse>(
    `/patients/${patientId}/soap-prefill`,
  )
  return data
}
