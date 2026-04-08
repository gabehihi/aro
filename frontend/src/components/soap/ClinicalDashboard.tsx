import { useEffect, useState } from "react"
import { getClinicalSummary } from "@/api/clinical"
import { useSoapStore } from "@/hooks/useSoapStore"
import { MetricCards } from "./MetricCards"
import { VitalTrendsChart } from "./VitalTrendsChart"
import { PastVisitTimeline } from "./PastVisitTimeline"
import type { ClinicalSummary } from "@/types"

export function ClinicalDashboard() {
  const { selectedPatient } = useSoapStore()
  const [summary, setSummary] = useState<ClinicalSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedPatient) {
      setSummary(null)
      return
    }

    let cancelled = false
    setLoading(true)

    getClinicalSummary(selectedPatient.id)
      .then((data) => {
        if (!cancelled) setSummary(data)
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
    summary.recent_encounters.length > 0

  if (!hasData) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
        진료 기록이 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MetricCards vitals={summary.recent_vitals} labs={summary.recent_labs} />
      <VitalTrendsChart vitals={summary.recent_vitals} />
      <PastVisitTimeline encounters={summary.recent_encounters} />
    </div>
  )
}
