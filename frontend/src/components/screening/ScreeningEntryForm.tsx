import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useScreeningStore } from "@/hooks/useScreeningStore"

interface Props {
  onSave: () => void
  onPreviewClassify: () => void
}

const LAB_KEYS = [
  "eGFR", "HbA1c", "FBS", "LDL", "AST", "ALT", "TSH",
  "Creatinine", "UA_protein", "SBP", "DBP",
]

export function ScreeningEntryForm({ onSave, onPreviewClassify }: Props) {
  const store = useScreeningStore()
  const [labValues, setLabValues] = useState<Record<string, string>>({})

  function handleLabChange(key: string, value: string) {
    const updated = { ...labValues, [key]: value }
    setLabValues(updated)
    const parsed: Record<string, string | number> = {}
    for (const [k, v] of Object.entries(updated)) {
      if (v.trim() === "") continue
      parsed[k] = isNaN(Number(v)) ? v.trim() : Number(v)
    }
    store.setResultsInput(JSON.stringify(parsed))
  }

  function getParsedResults(): Record<string, string | number> {
    try {
      return JSON.parse(store.resultsInput || "{}") as Record<string, string | number>
    } catch {
      return {}
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">검진 결과 입력</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">검진 유형</label>
          <select
            className="w-full border rounded px-2 py-1.5 text-xs"
            value={store.screeningType}
            onChange={(e) =>
              store.setScreeningType(e.target.value as typeof store.screeningType)
            }
          >
            <option>국가건강검진</option>
            <option>암검진</option>
            <option>생애전환기</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">검진일</label>
          <input
            type="date"
            className="w-full border rounded px-2 py-1.5 text-xs"
            value={store.screeningDate}
            onChange={(e) => store.setScreeningDate(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">성별</label>
            <select
              className="w-full border rounded px-2 py-1.5 text-xs"
              value={store.patientSex}
              onChange={(e) => store.setPatientSex(e.target.value as "M" | "F")}
            >
              <option value="M">남</option>
              <option value="F">여</option>
            </select>
          </div>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={store.patientHasDm}
                onChange={(e) => store.setPatientHasDm(e.target.checked)}
              />
              당뇨 동반
            </label>
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="text-xs text-gray-500 mb-2">검사 수치 입력 (빈칸 제외)</p>
          <div className="space-y-2">
            {LAB_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <label className="w-24 text-xs text-gray-600 flex-shrink-0">{key}</label>
                <input
                  className="flex-1 border rounded px-2 py-1 text-xs"
                  placeholder={key === "UA_protein" ? "negative/1+" : "숫자"}
                  value={labValues[key] ?? ""}
                  onChange={(e) => handleLabChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 bg-gray-100 text-gray-700 text-xs py-2 rounded hover:bg-gray-200 disabled:opacity-50"
            disabled={store.isClassifying || !Object.keys(getParsedResults()).length}
            onClick={onPreviewClassify}
          >
            {store.isClassifying ? "분류 중..." : "미리 보기"}
          </button>
          <button
            className="flex-1 bg-blue-600 text-white text-xs py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={store.isSaving || !store.selectedPatientId}
            onClick={onSave}
          >
            {store.isSaving ? "저장 중..." : "저장"}
          </button>
        </div>

        {!store.selectedPatientId && (
          <p className="text-xs text-amber-600">환자 ID를 먼저 입력하세요</p>
        )}
      </CardContent>
    </Card>
  )
}
