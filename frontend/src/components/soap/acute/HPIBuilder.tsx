import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSoapStore } from "@/hooks/useSoapStore"
import { generateAcuteSubjective } from "@/utils/soap/templates/hpi"
import { CopyButton } from "../preview/CopyButton"

export function HPIBuilder() {
  const acute = useSoapStore((s) => s.acute)
  const preview = generateAcuteSubjective(acute)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">HPI / ROS 미리보기</CardTitle>
        <CopyButton text={preview} size="xs" label="복사" />
      </CardHeader>
      <CardContent>
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-input bg-gray-50 px-3 py-2 text-xs font-mono leading-relaxed">
          {preview || "증상 토글 + CC 지정 + onset 입력 시 자동 생성됩니다."}
        </pre>
      </CardContent>
    </Card>
  )
}
