import api from "@/lib/api"
import type { ClinicalSummary } from "@/types"

export async function getClinicalSummary(
  patientId: string,
): Promise<ClinicalSummary> {
  const { data } = await api.get<ClinicalSummary>(
    `/patients/${patientId}/clinical-summary`,
  )
  return data
}
