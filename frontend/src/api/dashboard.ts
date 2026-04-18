import api from "@/lib/api"
import type { DashboardOverviewResponse } from "@/types"

export async function getDashboardSummary(): Promise<DashboardOverviewResponse> {
  const { data } = await api.get<DashboardOverviewResponse>("/dashboard/summary")
  return data
}
