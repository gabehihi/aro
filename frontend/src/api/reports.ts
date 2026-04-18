import api from "@/lib/api"
import type { MonthlyReportArchiveResponse } from "@/types"

export async function getReportArchive(limit = 12): Promise<MonthlyReportArchiveResponse> {
  const { data } = await api.get<MonthlyReportArchiveResponse>("/reports/archive", {
    params: { limit },
  })
  return data
}

export async function downloadArchivedReport(
  year: number,
  month: number,
): Promise<Blob> {
  const { data } = await api.get(`/reports/archive/${year}/${month}`, {
    responseType: "blob",
  })
  return data
}

export async function downloadMonthlyReport(
  year: number,
  month: number,
): Promise<Blob> {
  const { data } = await api.get("/reports/monthly", {
    params: { year, month },
    responseType: "blob",
  })
  return data
}
