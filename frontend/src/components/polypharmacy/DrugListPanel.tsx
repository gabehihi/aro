import { useState } from "react"
import { X, Plus, Pill } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CLINICAL_FLAGS = [
  { key: "AKI", label: "AKI (급성 신손상)" },
  { key: "DEHYDRATION", label: "탈수" },
  { key: "SEVERE_INFECTION", label: "중증 감염" },
  { key: "HEART_FAILURE", label: "심부전 악화" },
  { key: "HYPOTENSION", label: "저혈압" },
  { key: "POOR_ORAL_INTAKE", label: "경구 섭취 불량" },
]

interface Props {
  drugInns: string[]
  egfr: string
  crcl: string
  clinicalFlags: string[]
  onAddDrug: (inn: string) => void
  onRemoveDrug: (inn: string) => void
  onEgfrChange: (v: string) => void
  onCrclChange: (v: string) => void
  onToggleFlag: (flag: string) => void
  onReview: () => void
  isReviewing: boolean
}

export function DrugListPanel({
  drugInns,
  egfr,
  crcl,
  clinicalFlags,
  onAddDrug,
  onRemoveDrug,
  onEgfrChange,
  onCrclChange,
  onToggleFlag,
  onReview,
  isReviewing,
}: Props) {
  const [inputValue, setInputValue] = useState("")

  const handleAdd = () => {
    const trimmed = inputValue.trim().toLowerCase()
    if (trimmed) {
      onAddDrug(trimmed)
      setInputValue("")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Pill className="h-4 w-4" />
            처방 약물 (INN 명)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="INN명 입력 (예: metformin)"
              className="text-sm"
            />
            <Button onClick={handleAdd} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {drugInns.map((inn) => (
              <Badge key={inn} variant="secondary" className="flex items-center gap-1 pr-1">
                {inn}
                <button onClick={() => onRemoveDrug(inn)} className="ml-1 hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {drugInns.length === 0 && (
              <p className="text-xs text-gray-400">약물을 추가하세요</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">신기능</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">eGFR (CKD-EPI)</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={egfr}
                onChange={(e) => onEgfrChange(e.target.value)}
                placeholder="예: 65"
                className="w-28 text-sm"
              />
              <span className="text-xs text-gray-500">mL/min/1.73m²</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">CrCl (Cockcroft-Gault)</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={crcl}
                onChange={(e) => onCrclChange(e.target.value)}
                placeholder="예: 55"
                className="w-28 text-sm"
              />
              <span className="text-xs text-gray-500">mL/min</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            항생제·FDA PI 기반 약물은 CrCl 사용 · KDIGO/CKD 기반 약물은 eGFR 사용
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">급성 상황 (Sick Day)</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex flex-wrap gap-2">
            {CLINICAL_FLAGS.map((f) => (
              <button
                key={f.key}
                onClick={() => onToggleFlag(f.key)}
                className={`px-2 py-1 rounded text-xs border transition-colors ${
                  clinicalFlags.includes(f.key)
                    ? "bg-orange-100 border-orange-400 text-orange-800"
                    : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={onReview}
        disabled={drugInns.length === 0 || isReviewing}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isReviewing ? "검토 중..." : "약물검토 시작"}
      </Button>
    </div>
  )
}
