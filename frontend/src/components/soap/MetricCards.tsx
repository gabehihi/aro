import { Card, CardContent } from "@/components/ui/card"

interface MetricCardProps {
  label: string
  value: string | number | null
  unit: string
  delta?: string
  status: "safe" | "warning" | "urgent" | "neutral"
}

const STATUS_STYLES = {
  safe: "border-l-green-500 bg-green-50",
  warning: "border-l-amber-500 bg-amber-50",
  urgent: "border-l-red-500 bg-red-50",
  neutral: "border-l-gray-300 bg-gray-50",
}

function MetricCard({ label, value, unit, delta, status }: MetricCardProps) {
  return (
    <Card className={`border-l-4 ${STATUS_STYLES[status]}`}>
      <CardContent className="p-3">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xl font-bold">
          {value ?? "-"} <span className="text-xs font-normal text-gray-400">{unit}</span>
        </div>
        {delta && <div className="text-xs text-gray-500">{delta}</div>}
      </CardContent>
    </Card>
  )
}

function getBPStatus(sbp: number | null, dbp: number | null): "safe" | "warning" | "urgent" | "neutral" {
  if (sbp === null || dbp === null) return "neutral"
  if (sbp >= 180 || dbp >= 120) return "urgent"
  if (sbp >= 140 || dbp >= 90) return "warning"
  return "safe"
}

function getHbA1cStatus(val: number | null): "safe" | "warning" | "urgent" | "neutral" {
  if (val === null) return "neutral"
  if (val >= 9.0) return "urgent"
  if (val >= 7.0) return "warning"
  return "safe"
}

function getEGFRStatus(val: number | null): "safe" | "warning" | "urgent" | "neutral" {
  if (val === null) return "neutral"
  if (val < 30) return "urgent"
  if (val < 60) return "warning"
  return "safe"
}

function getBMIStatus(val: number | null): "safe" | "warning" | "urgent" | "neutral" {
  if (val === null) return "neutral"
  if (val >= 30 || val < 18.5) return "warning"
  return "safe"
}

interface MetricCardsProps {
  vitals: Record<string, unknown>[]
  labs: Record<string, unknown>[]
}

export function MetricCards({ vitals, labs }: MetricCardsProps) {
  // Get latest vitals
  const latest = vitals[0] as Record<string, number | null> | undefined

  // Find latest HbA1c and eGFR from labs
  let latestHbA1c: number | null = null
  let latestEGFR: number | null = null

  for (const labEntry of labs) {
    const labList = (labEntry as Record<string, unknown>).labs as
      | { name: string; value: number }[]
      | undefined
    if (!labList) continue
    for (const lab of labList) {
      if (lab.name === "HbA1c" && latestHbA1c === null) latestHbA1c = lab.value
      if (lab.name === "eGFR" && latestEGFR === null) latestEGFR = lab.value
    }
  }

  const sbp = (latest?.sbp as number | null) ?? null
  const dbp = (latest?.dbp as number | null) ?? null
  const bmi = (latest?.bmi as number | null) ?? null

  return (
    <div className="grid grid-cols-2 gap-2">
      <MetricCard
        label="BP"
        value={sbp !== null && dbp !== null ? `${sbp}/${dbp}` : null}
        unit="mmHg"
        status={getBPStatus(sbp, dbp)}
      />
      <MetricCard
        label="HbA1c"
        value={latestHbA1c}
        unit="%"
        status={getHbA1cStatus(latestHbA1c)}
      />
      <MetricCard
        label="eGFR"
        value={latestEGFR}
        unit="mL/min"
        status={getEGFRStatus(latestEGFR)}
      />
      <MetricCard
        label="BMI"
        value={bmi}
        unit="kg/m2"
        status={getBMIStatus(bmi)}
      />
    </div>
  )
}
