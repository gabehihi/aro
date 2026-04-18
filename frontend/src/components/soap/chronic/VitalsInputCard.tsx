import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { bmiCategory, calcBMI } from "@/utils/soap/bmi"

const FIELDS: { key: keyof ReturnType<typeof useVitals>; label: string; unit: string }[] = [
  { key: "sbp", label: "SBP", unit: "mmHg" },
  { key: "dbp", label: "DBP", unit: "mmHg" },
  { key: "hr", label: "HR", unit: "bpm" },
  { key: "bt", label: "BT", unit: "℃" },
  { key: "rr", label: "RR", unit: "/min" },
  { key: "spo2", label: "SpO₂", unit: "%" },
  { key: "bw", label: "BW", unit: "kg" },
  { key: "bh", label: "BH", unit: "cm" },
  { key: "waist", label: "Waist", unit: "cm" },
]

function useVitals() {
  return useSoapStore((s) => s.chronic.vitals)
}

export function VitalsInputCard() {
  const vitals = useVitals()
  const update = useSoapStore((s) => s.updateChronicVitals)
  const bmi = calcBMI(parseFloat(vitals.bw) || null, parseFloat(vitals.bh) || null)
  const bmiCat = bmiCategory(bmi)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">활력 징후 / 체성분</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-1.5">
          {FIELDS.map(({ key, label, unit }) => (
            <div key={key}>
              <Label className="text-xs text-gray-600">
                {label} <span className="text-gray-400">({unit})</span>
              </Label>
              <Input
                inputMode="decimal"
                value={vitals[key]}
                onChange={(e) => update({ [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        {bmi !== null ? (
          <p className="mt-2 text-xs text-gray-600">
            BMI {bmi.toFixed(1)} kg/m²
            {bmiCat ? <span className="ml-1 text-gray-500">({bmiCat})</span> : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
