import { Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSoapStore } from "@/hooks/useSoapStore"

const VITAL_LABELS: Record<string, { label: string; unit: string }> = {
  sbp: { label: "SBP", unit: "mmHg" },
  dbp: { label: "DBP", unit: "mmHg" },
  hr: { label: "HR", unit: "bpm" },
  bt: { label: "BT", unit: "C" },
  rr: { label: "RR", unit: "/min" },
  spo2: { label: "SpO2", unit: "%" },
  bw: { label: "BW", unit: "kg" },
  bh: { label: "BH", unit: "cm" },
  bmi: { label: "BMI", unit: "kg/m2" },
}

export function VitalsCard() {
  const { soapResult } = useSoapStore()

  if (!soapResult) return null

  const vitals = soapResult.vitals
  const entries = Object.entries(vitals).filter(
    ([, v]) => v !== null && v !== undefined,
  )

  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          Vitals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {entries.map(([key, value]) => {
            const info = VITAL_LABELS[key]
            if (!info) return null
            return (
              <div key={key} className="rounded-md bg-gray-50 p-2 text-center">
                <div className="text-xs text-gray-500">{info.label}</div>
                <div className="text-lg font-semibold">{value}</div>
                <div className="text-xs text-gray-400">{info.unit}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
