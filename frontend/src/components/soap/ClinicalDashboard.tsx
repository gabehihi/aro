import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { getClinicalSummary } from "@/api/clinical"
import { useSoapStore } from "@/hooks/useSoapStore"
import { Badge } from "@/components/ui/badge"
import { LabHistoryTable } from "./LabHistoryTable"
import { MetricCards } from "./MetricCards"
import { VitalTrendsChart } from "./VitalTrendsChart"
import { PastVisitTimeline } from "./PastVisitTimeline"
import type { ClinicalFollowUpAlert, ClinicalSummary } from "@/types"

const priorityBadge: Record<string, "destructive" | "secondary" | "outline"> = {
  urgent: "destructive",
  due: "secondary",
  upcoming: "outline",
}

const priorityLabel: Record<string, string> = {
  urgent: "즉시",
  due: "기한 임박",
  upcoming: "예정",
}

export function ClinicalDashboard() {
  const { selectedPatient } = useSoapStore()
  const [summary, setSummary] = useState<ClinicalSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedPatient) {
      setSummary(null)
      useSoapStore.getState().setClinicalSummary(null)
      return
    }

    let cancelled = false
    setLoading(true)

    getClinicalSummary(selectedPatient.id)
      .then((data) => {
        if (!cancelled) {
          setSummary(data)
          useSoapStore.getState().setClinicalSummary(data)
        }
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedPatient])

  if (!selectedPatient) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        임상 데이터 로딩...
      </div>
    )
  }

  if (!summary) return null

  const hasData =
    summary.recent_vitals.length > 0 ||
    summary.recent_encounters.length > 0 ||
    summary.follow_up_alerts.length > 0

  if (!hasData) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
        진료 기록이 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {summary.follow_up_alerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-900">미해결 F/U 알림</p>
          </div>
          <div className="space-y-2">
            {summary.follow_up_alerts.map((alert: ClinicalFollowUpAlert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between rounded-md border border-amber-100 bg-white/80 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{alert.item}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {alert.last_value ? `최근 값 ${alert.last_value} · ` : ""}
                    권고일 {alert.due_date}
                  </p>
                </div>
                <Badge variant={priorityBadge[alert.priority] ?? "outline"}>
                  {priorityLabel[alert.priority] ?? alert.priority}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <MetricCards vitals={summary.recent_vitals} labs={summary.recent_labs} />
      <VitalTrendsChart vitals={summary.recent_vitals} />
      <PastVisitTimeline encounters={summary.recent_encounters} />
      <LabHistoryTable recentLabs={summary.recent_labs} />
    </div>
  )
}
