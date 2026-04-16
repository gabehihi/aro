import api from "@/lib/api"
import type {
  ClassifyPreviewRequest,
  ClassifyPreviewResponse,
  ScreeningResultCreate,
  ScreeningResultResponse,
  DashboardResponse,
} from "@/types"

export async function classifyPreview(
  body: ClassifyPreviewRequest,
): Promise<ClassifyPreviewResponse> {
  const { data } = await api.post<ClassifyPreviewResponse>(
    "/screening/classify-preview",
    body,
  )
  return data
}

export async function saveScreeningResult(
  body: ScreeningResultCreate,
): Promise<ScreeningResultResponse> {
  const { data } = await api.post<ScreeningResultResponse>(
    "/screening/results",
    body,
  )
  return data
}

export async function getDashboard(): Promise<DashboardResponse> {
  const { data } = await api.get<DashboardResponse>("/screening/dashboard")
  return data
}

export async function resolveAlert(alertId: string): Promise<void> {
  await api.patch(`/screening/alerts/${alertId}/resolve`)
}
