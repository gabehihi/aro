import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSoapStore } from "@/hooks/useSoapStore"

export function PatientSummaryCard() {
  const { selectedPatient } = useSoapStore()

  if (!selectedPatient) return null

  const age = new Date().getFullYear() - new Date(selectedPatient.birth_date).getFullYear()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {selectedPatient.name}
          <span className="ml-2 text-sm font-normal text-gray-500">
            {selectedPatient.chart_no} / {selectedPatient.sex === "M" ? "남" : "여"} / {age}세
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-gray-500 mr-1">만성질환:</span>
          {selectedPatient.chronic_diseases.length > 0 ? (
            selectedPatient.chronic_diseases.map((d) => (
              <Badge key={d} variant="secondary" className="text-xs">
                {d}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-gray-400">없음</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-gray-500 mr-1">알레르기:</span>
          {selectedPatient.allergies.length > 0 ? (
            selectedPatient.allergies.map((a) => (
              <Badge key={a} variant="destructive" className="text-xs">
                {a}
              </Badge>
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
      </CardContent>
    </Card>
  )
}
