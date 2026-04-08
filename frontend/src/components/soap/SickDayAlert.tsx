import { AlertTriangle } from "lucide-react"
import { useSoapStore } from "@/hooks/useSoapStore"

const ACTION_STYLES = {
  HOLD: "bg-red-50 border-red-300 text-red-800",
  REDUCE: "bg-orange-50 border-orange-300 text-orange-800",
  MONITOR: "bg-yellow-50 border-yellow-300 text-yellow-800",
}

const ACTION_LABELS = {
  HOLD: "중단 권고",
  REDUCE: "감량 권고",
  MONITOR: "모니터링",
}

export function SickDayAlertBanner() {
  const { soapResult } = useSoapStore()

  if (!soapResult || soapResult.sick_day_alerts.length === 0) return null

  return (
    <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <span className="font-bold text-red-800">
          Sick Day Rule 감지 ({soapResult.sick_day_alerts[0].triggering_keyword})
        </span>
      </div>
      <div className="space-y-2">
        {soapResult.sick_day_alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-center justify-between rounded-md border p-2 ${
              ACTION_STYLES[alert.action]
            }`}
          >
            <div>
              <span className="font-semibold text-sm">{alert.drug_name}</span>
              {alert.ingredient && (
                <span className="ml-1 text-xs opacity-75">({alert.ingredient})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">{alert.reason}</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-bold bg-white/50">
                {ACTION_LABELS[alert.action]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
