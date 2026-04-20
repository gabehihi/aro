import api from "@/lib/api"
import type { PolypharmacyPrefillData, PolypharmacyReport, PolypharmacyReviewRequest } from "@/types"

export async function reviewPolypharmacy(
  body: PolypharmacyReviewRequest,
): Promise<PolypharmacyReport> {
  const { data } = await api.post<PolypharmacyReport>("/polypharmacy/review", body)
  return data
}

export async function getPolypharmacyPrefill(patientId: string): Promise<PolypharmacyPrefillData> {
  const { data } = await api.get<PolypharmacyPrefillData>(
    `/polypharmacy/patients/${patientId}/polypharmacy-prefill`,
  )
  return data
}
