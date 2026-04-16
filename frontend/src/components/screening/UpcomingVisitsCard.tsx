import { useEffect, useState } from "react"
import { CalendarClock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getVisits, updateVisit } from "@/api/visits"
import type { VisitScheduleItem } from "@/types"

export function UpcomingVisitsCard() {
  const [visits, setVisits] = useState<VisitScheduleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVisits({ upcoming_only: true, limit: 10 })
      .then(setVisits)
      .finally(() => setLoading(false))
  }, [])

  async function handleComplete(id: string) {
    await updateVisit(id, { visit_completed: true })
    setVisits((prev) => prev.filter((v) => v.id !== id))
  }

  if (loading) return null

  if (visits.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarClock size={16} /> 예정 내원
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-400 text-center py-2">예정된 내원이 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarClock size={16} /> 예정 내원 ({visits.length}건)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visits.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded border p-2.5 text-xs">
            <div>
              <span className="font-medium">{v.patient_name}</span>
              <span className="ml-1.5 text-gray-400">({v.chart_no})</span>
              <p className="text-gray-500 mt-0.5">
                {v.scheduled_date}
                {v.needs_fasting && <span className="ml-1.5 text-orange-500">· 금식 필요</span>}
                {v.planned_tests.length > 0 && (
                  <span className="ml-1.5 text-gray-400">· {v.planned_tests.join(", ")}</span>
                )}
              </p>
            </div>
            <button
              className="text-xs text-gray-400 hover:text-gray-700 underline"
              onClick={() => handleComplete(v.id)}
            >
              완료
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
