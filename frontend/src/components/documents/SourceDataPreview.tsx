import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Database } from "lucide-react"
import { useState } from "react"

interface Props {
  sourceData: Record<string, unknown> | null
}

export function SourceDataPreview({ sourceData }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!sourceData) return null

  const patient = sourceData.patient as Record<string, unknown> | undefined
  const encounter = sourceData.encounter as Record<string, unknown> | undefined
  const prescriptions = sourceData.active_prescriptions as
    | Record<string, unknown>[]
    | undefined

  return (
    <Card>
      <CardHeader
        className="cursor-pointer p-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" />
            참조 데이터 (Source Data)
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-3 p-3 pt-0 text-xs">
          {patient && (
            <div>
              <p className="font-semibold text-gray-600">환자 정보</p>
              <p>
                {String(patient.name)} | {String(patient.birth_date)} |{" "}
                {String(patient.sex)} | {String(patient.insurance_type)}
              </p>
              {(patient.chronic_diseases as string[])?.length > 0 && (
                <p>
                  만성질환: {(patient.chronic_diseases as string[]).join(", ")}
                </p>
              )}
            </div>
          )}
          {encounter && (
            <div>
              <p className="font-semibold text-gray-600">진료 기록</p>
              <p>일자: {String(encounter.encounter_date)}</p>
              {encounter.assessment ? <p>A: {String(encounter.assessment)}</p> : null}
            </div>
          )}
          {prescriptions && prescriptions.length > 0 && (
            <div>
              <p className="font-semibold text-gray-600">현재 처방</p>
              {prescriptions.map((rx, i) => (
                <p key={i}>
                  {String(rx.drug_name ?? "")} {String(rx.dose ?? "")} {String(rx.frequency ?? "")}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
