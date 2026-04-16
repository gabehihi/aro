import api from "@/lib/api"
import type { VisitScheduleCreate, VisitScheduleUpdate, VisitScheduleItem } from "@/types"

export async function getVisits(params?: {
  patient_id?: string
  upcoming_only?: boolean
  limit?: number
}): Promise<VisitScheduleItem[]> {
  const { data } = await api.get<VisitScheduleItem[]>("/visits", { params })
  return data
}

export async function createVisit(body: VisitScheduleCreate): Promise<VisitScheduleItem> {
  const { data } = await api.post<VisitScheduleItem>("/visits", body)
  return data
}

export async function updateVisit(id: string, body: VisitScheduleUpdate): Promise<VisitScheduleItem> {
  const { data } = await api.patch<VisitScheduleItem>(`/visits/${id}`, body)
  return data
}

export async function cancelVisit(id: string): Promise<void> {
  await api.delete(`/visits/${id}`)
}
