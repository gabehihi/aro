import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RenalRecommendation } from "@/types"

const REC_CONFIG = {
  FULL_DOSE: { label: "정상 용량", color: "bg-green-100 text-green-800" },
  REDUCE: { label: "용량 감량", color: "bg-yellow-100 text-yellow-800" },
  AVOID: { label: "사용 주의", color: "bg-orange-100 text-orange-800" },
  CONTRAINDICATED: { label: "금기", color: "bg-red-100 text-red-800" },
  NOT_IN_DB: { label: "DB 미등록", color: "bg-gray-100 text-gray-700" },
} as const

interface Props {
  recommendations: RenalRecommendation[]
  egfr: number | null
}

export function RenalDosingPanel({ recommendations, egfr }: Props) {
  if (recommendations.length === 0) return null

  const flagged = recommendations.filter((r) => r.recommendation !== "FULL_DOSE")

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-sm">
          신기능 용량 조절
          {egfr !== null && (
            <span className="ml-2 text-xs font-normal text-gray-500">(eGFR {egfr})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {flagged.length === 0 ? (
          <p className="text-sm text-green-700">모든 약물 정상 용량 사용 가능</p>
        ) : (
          flagged.map((r, i) => {
            const cfg = REC_CONFIG[r.recommendation] ?? REC_CONFIG.NOT_IN_DB
            return (
              <div key={i} className="border rounded p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.drug_inn}</span>
                  <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                  {r.max_daily_dose && (
                    <span className="text-xs text-gray-600 ml-auto">최대 {r.max_daily_dose}</span>
                  )}
                </div>
                <p className="text-xs text-gray-700">{r.detail}</p>
                {r.monitoring.length > 0 && (
                  <p className="text-xs text-gray-500">모니터링: {r.monitoring.join(", ")}</p>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
