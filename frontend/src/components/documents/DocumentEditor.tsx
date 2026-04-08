import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit3 } from "lucide-react"

interface Props {
  value: string
  onChange: (text: string) => void
}

export function DocumentEditor({ value, onChange }: Props) {
  if (!value) return null

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Edit3 className="h-4 w-4" />
          문서 편집
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          className="w-full rounded border border-gray-300 p-3 text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="생성된 문서를 편집할 수 있습니다. [의사 소견: ___] 부분을 채워주세요."
        />
        <p className="mt-1 text-xs text-gray-500">
          [의사 소견: ___] 플레이스홀더를 의사 판단으로 교체해 주세요.
        </p>
      </CardContent>
    </Card>
  )
}
