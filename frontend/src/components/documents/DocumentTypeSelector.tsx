import { Card, CardContent } from "@/components/ui/card"
import type { DocType } from "@/types"

const DOC_TYPES: { value: DocType; label: string; description: string }[] = [
  { value: "진단서", label: "진단서", description: "진단명, KCD 코드, 임상 소견" },
  { value: "소견서", label: "소견서", description: "상세 임상 경과 및 현재 상태" },
  { value: "확인서", label: "진료확인서", description: "내원일, 방문 횟수, 진단명" },
  { value: "의뢰서", label: "진료의뢰서", description: "의뢰 사유, 임상 요약, 요청 검사" },
  { value: "건강진단서", label: "건강진단서", description: "채용용 건강진단 결과" },
  { value: "검사결과안내서", label: "검사결과안내서", description: "이상 결과 요약과 추후 권고" },
  { value: "교육문서", label: "교육문서", description: "질환별 생활관리 및 복약 교육" },
]

interface Props {
  selected: DocType | null
  onSelect: (docType: DocType) => void
}

export function DocumentTypeSelector({ selected, onSelect }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">문서 유형 선택</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {DOC_TYPES.map((dt) => (
          <Card
            key={dt.value}
            className={`cursor-pointer transition-all ${
              selected === dt.value
                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                : "hover:border-gray-300"
            }`}
            onClick={() => onSelect(dt.value)}
          >
            <CardContent className="p-3">
              <p className="text-sm font-semibold">{dt.label}</p>
              <p className="mt-1 text-xs text-gray-500">{dt.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
