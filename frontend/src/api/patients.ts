import api from "@/lib/api"
import type {
  Patient,
  PatientCreate,
  PatientListResponse,
  PatientUpdate,
} from "@/types"

export async function getPatients(
  q = "",
  page = 1,
  size = 20,
): Promise<PatientListResponse> {
  const { data } = await api.get<PatientListResponse>("/patients", {
    params: { q, page, size },
  })
  return data
}

export async function getPatient(id: string): Promise<Patient> {
  const { data } = await api.get<Patient>(`/patients/${id}`)
  return data
}

export async function createPatient(body: PatientCreate): Promise<Patient> {
  const { data } = await api.post<Patient>("/patients", body)
  return data
}

export async function updatePatient(
  id: string,
  body: PatientUpdate,
): Promise<Patient> {
  const { data } = await api.put<Patient>(`/patients/${id}`, body)
  return data
}

export async function deletePatient(id: string): Promise<void> {
  await api.delete(`/patients/${id}`)
}
