import api from "@/lib/api"
import type {
  SOAPRequest,
  SOAPResponse,
  Encounter,
  EncounterCreate,
  EncounterListResponse,
} from "@/types"

export async function convertSOAP(body: SOAPRequest): Promise<SOAPResponse> {
  const { data } = await api.post<SOAPResponse>("/soap/convert", body)
  return data
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
