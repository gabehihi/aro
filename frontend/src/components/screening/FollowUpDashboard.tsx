import { useEffect } from "react"
import { Calendar, AlertTriangle, UserX, ClipboardList } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useScreeningStore } from "@/hooks/useScreeningStore"
import { getDashboard, resolveAlert } from "@/api/screening"
import { DashboardMetricCard } from "./DashboardMetricCard"
import { UpcomingVisitsCard } from "./UpcomingVisitsCard"
import type { FollowUpAlertItem } from "@/types"

const priorityBadge: Record<string, "destructive" | "secondary" | "outline"> = {
  urgent: "destructive",
  due: "secondary",
  upcoming: "outline",
}

const priorityLabel: Record<string, string> = {
  urgent: "즉시",
  due: "이번 주",
  upcoming: "예정",
}

export function FollowUpDashboard() {
  const store = useScreeningStore()

  useEffect(() => {
    store.setIsDashboardLoading(true)
    getDashboard()
      .then((d) => store.setDashboard(d))
      .catch(() => store.setError("대시보드 데이터를 불러오지 못했습니다."))
      .finally(() => store.setIsDashboardLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleResolve(alertId: string) {
    await resolveAlert(alertId)
    const d = await getDashboard()
    store.setDashboard(d)
  }

  if (store.isDashboardLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        대시보드 로딩 중...
      </div>
    )
  }

  const d = store.dashboard
  if (!d) return null

  return (
    <div className="space-y-6">
      <UpcomingVisitsCard />
      <div className="grid grid-cols-2 gap-3">
        <DashboardMetricCard
          label="오늘 F/U 예정"
          value={d.summary.today_appointments}
          icon={Calendar}
          color="green"
        />
        <DashboardMetricCard
          label="F/U 필요 환자"
          value={d.summary.followup_needed}
          icon={AlertTriangle}
          color={d.summary.followup_needed > 0 ? "yellow" : "default"}
        />
        <DashboardMetricCard
          label="이번 주 미방문"
          value={d.summary.noshow_last_week}
          icon={UserX}
          color={d.summary.noshow_last_week > 0 ? "red" : "default"}
        />
        <DashboardMetricCard
          label="검진 미완료"
          value={d.summary.screening_incomplete}
          icon={ClipboardList}
        />
      </div>

      {d.followup_alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">F/U 필요 알림</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.followup_alerts.map((alert: FollowUpAlertItem) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded border p-3 text-sm"
              >
                <div>
                  <span className="font-medium">{alert.patient_name}</span>
                  <span className="ml-2 text-gray-400 text-xs">({alert.chart_no})</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {alert.item} {alert.last_value ?? ""} — {alert.due_date} 재검 권고
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={priorityBadge[alert.priority]}>
                    {priorityLabel[alert.priority]}
                  </Badge>
                  <button
                    className="text-xs text-gray-400 hover:text-gray-700 underline"
                    onClick={() => handleResolve(alert.id)}
                  >
                    완료
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {d.noshow_patients.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-600">미방문 환자</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.noshow_patients.map((p) => (
              <div
                key={p.patient_id}
                className="flex items-center justify-between rounded border p-3 text-sm"
              >
                <div>
                  <span className="font-medium">{p.patient_name}</span>
                  <span className="ml-2 text-gray-400 text-xs">({p.chart_no})</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    예약일: {p.scheduled_date}
                    {p.planned_tests.length > 0 && ` · ${p.planned_tests.join(", ")}`}
                  </p>
                </div>
                <Badge variant="destructive">미방문</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {d.followup_alerts.length === 0 && d.noshow_patients.length === 0 && (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          현재 F/U 알림이 없습니다
        </div>
      )}
    </div>
  )
}
