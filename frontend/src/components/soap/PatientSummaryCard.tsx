import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useSoapStore } from "@/hooks/useSoapStore"
import { bmiCategory, calcBMI } from "@/utils/soap/bmi"

const VITALS_FIELDS = [
  { key: "sbp", label: "SBP" },
  { key: "dbp", label: "DBP" },
  { key: "hr", label: "HR" },
  { key: "bt", label: "BT" },
  { key: "rr", label: "RR" },
  { key: "spo2", label: "SpO₂" },
  { key: "bw", label: "BW" },
  { key: "bh", label: "BH" },
  { key: "waist", label: "허리" },
] as const

type VitalKey = (typeof VITALS_FIELDS)[number]["key"]

export function PatientSummaryCard() {
  const selectedPatient = useSoapStore((s) => s.selectedPatient)
  const vitals = useSoapStore((s) => s.chronic.vitals)
  const update = useSoapStore((s) => s.updateChronicVitals)

  if (!selectedPatient) return null

  const age = new Date().getFullYear() - new Date(selectedPatient.birth_date).getFullYear()
  const bmi = calcBMI(parseFloat(vitals.bw) || null, parseFloat(vitals.bh) || null)
  const bmiCat = bmiCategory(bmi)

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle className="text-base">
          {selectedPatient.name}
          <span className="ml-2 text-sm font-normal text-gray-500">
            {selectedPatient.chart_no} / {selectedPatient.sex === "M" ? "남" : "여"} / {age}세
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-gray-500 mr-1">만성질환:</span>
          {selectedPatient.chronic_diseases.length > 0 ? (
            selectedPatient.chronic_diseases.map((d) => (
              <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
            ))
          ) : (
            <span className="text-xs text-gray-400">없음</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-gray-500 mr-1">알레르기:</span>
          {selectedPatient.allergies.length > 0 ? (
            selectedPatient.allergies.map((a) => (
              <Badge key={a} variant="destructive" className="text-xs">{a}</Badge>
            ))
          ) : (
            <span className="text-xs text-gray-400">없음</span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          보험: {selectedPatient.insurance_type}
          {selectedPatient.memo && (
            <span className="ml-3">메모: {selectedPatient.memo}</span>
          )}
        </div>

        {/* Compact vitals */}
        <div className="border-t pt-2">
          <div className="grid grid-cols-5 gap-1">
            {VITALS_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-500 leading-none">{label}</span>
                <Input
                  inputMode="decimal"
                  value={vitals[key as VitalKey]}
                  onChange={(e) => update({ [key]: e.target.value })}
                  className="h-6 px-1.5 text-xs"
                />
              </div>
            ))}
          </div>
          {bmi !== null ? (
            <p className="mt-1 text-[10px] text-gray-500">
              BMI {bmi.toFixed(1)}{bmiCat ? ` (${bmiCat})` : ""}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
