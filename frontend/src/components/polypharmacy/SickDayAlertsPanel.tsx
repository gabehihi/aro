import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SickDayAlert } from "@/types"

const ACTION_CONFIG = {
  HOLD: { label: "중단", color: "bg-red-100 text-red-800 border-red-300" },
  REDUCE: { label: "감량", color: "bg-orange-100 text-orange-800 border-orange-300" },
  MONITOR: { label: "모니터링", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
} as const

interface Props {
  alerts: SickDayAlert[]
}

export function SickDayAlertsPanel({ alerts }: Props) {
  if (alerts.length === 0) return null

  return (
    <Card className="border-orange-200">
      <CardHeader className="p-3 bg-orange-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-sm text-orange-800">
          <AlertTriangle className="h-4 w-4" />
          Sick Day 경보 ({alerts.length}건)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2 mt-2">
        {alerts.map((a, i) => {
          const cfg = ACTION_CONFIG[a.action] ?? ACTION_CONFIG.MONITOR
          return (
            <div key={i} className={`rounded border p-2 ${cfg.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{a.drug_inn}</span>
                <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                <span className="text-xs ml-auto">트리거: {a.trigger_matched}</span>
              </div>
              <p className="text-xs">{a.reason}</p>
              {a.detail && <p className="text-xs mt-1 text-gray-600">{a.detail}</p>}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
