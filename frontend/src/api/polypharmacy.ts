import api from "@/lib/api"
import type { PolypharmacyReport, PolypharmacyReviewRequest } from "@/types"

export async function reviewPolypharmacy(
  body: PolypharmacyReviewRequest,
): Promise<PolypharmacyReport> {
  const { data } = await api.post<PolypharmacyReport>("/polypharmacy/review", body)
  return data
}
