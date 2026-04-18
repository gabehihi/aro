import api from "@/lib/api"
import type { Prescription, PrescriptionCreate, PrescriptionUpdate } from "@/types"

export async function getPrescriptions(
  patientId: string,
  activeOnly = true,
): Promise<Prescription[]> {
  const { data } = await api.get<Prescription[]>(
    `/patients/${patientId}/prescriptions`,
    { params: { active_only: activeOnly } },
  )
  return data
}

export async function createPrescription(
  patientId: string,
  body: PrescriptionCreate,
): Promise<Prescription> {
  const { data } = await api.post<Prescription>(
    `/patients/${patientId}/prescriptions`,
    body,
  )
  return data
}

export async function updatePrescription(
  prescriptionId: string,
  body: PrescriptionUpdate,
): Promise<Prescription> {
  const { data } = await api.patch<Prescription>(
    `/prescriptions/${prescriptionId}`,
    body,
  )
  return data
}

export async function deletePrescription(prescriptionId: string): Promise<void> {
  await api.delete(`/prescriptions/${prescriptionId}`)
}
