import { AlertTriangle, ShieldAlert, AlertCircle, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { DDIFinding } from "@/types"

const SEVERITY_CONFIG = {
  CONTRAINDICATED: {
    label: "병용금기",
    color: "bg-red-100 text-red-800 border-red-300",
    Icon: ShieldAlert,
  },
  MAJOR: {
    label: "주요",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    Icon: AlertTriangle,
  },
  MODERATE: {
    label: "중등도",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Icon: AlertCircle,
  },
  MINOR: {
    label: "경미",
    color: "bg-gray-100 text-gray-700 border-gray-300",
    Icon: Info,
  },
} as const

interface Props {
  findings: DDIFinding[]
}

export function DDIFindings({ findings }: Props) {
  if (findings.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm text-green-700">약물 상호작용 — 해당 없음</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-sm">약물 상호작용 ({findings.length}건)</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {findings.map((f) => {
          const cfg = SEVERITY_CONFIG[f.severity] ?? SEVERITY_CONFIG.MINOR
          const { Icon } = cfg
          return (
            <div key={`${f.drug_a}-${f.drug_b}`} className={`rounded-lg border p-3 ${cfg.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="font-semibold text-sm">
                  {f.drug_a} + {f.drug_b}
                </span>
                <Badge className={`ml-auto text-xs ${cfg.color}`}>{cfg.label}</Badge>
              </div>
              <p className="text-xs mb-1">{f.mechanism}</p>
              <p className="text-xs font-medium">처치: {f.management}</p>
              {f.clinic_note && (
                <p className="text-xs mt-1 italic text-gray-600">{f.clinic_note}</p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
