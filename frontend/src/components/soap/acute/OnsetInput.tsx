import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"

const ONSET_QUICK = ["오늘", "어제", "2일 전", "3일 전", "1주일 전", "2주일 전"]
const DURATION_QUICK = ["지속적", "간헐적", "악화 추세", "호전 추세"]

export function OnsetInput() {
  const acute = useSoapStore((s) => s.acute)
  const setAcute = useSoapStore((s) => s.setAcute)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Onset / 양상</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <Label className="text-xs text-gray-600">Onset (언제부터?)</Label>
          <Input
            value={acute.onset}
            onChange={(e) => setAcute({ onset: e.target.value })}
            placeholder="예: 3일 전 / 2026-04-15"
          />
          <div className="mt-1 flex flex-wrap gap-1">
            {ONSET_QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAcute({ onset: q })}
                className="rounded-md border border-input bg-background px-2 py-0.5 text-xs text-gray-600 hover:bg-muted"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-600">지속성</Label>
          <Input
            value={acute.duration}
            onChange={(e) => setAcute({ duration: e.target.value })}
            placeholder="예: 지속적 / 간헐적"
          />
          <div className="mt-1 flex flex-wrap gap-1">
            {DURATION_QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAcute({ duration: q })}
                className="rounded-md border border-input bg-background px-2 py-0.5 text-xs text-gray-600 hover:bg-muted"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-xs text-gray-600">양상 (선택)</Label>
            <Input
              value={acute.pattern}
              onChange={(e) => setAcute({ pattern: e.target.value })}
              placeholder="예: 야간 악화"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">추가 기술</Label>
            <Input
              value={acute.additional}
              onChange={(e) => setAcute({ additional: e.target.value })}
              placeholder="예: 타병원 복용 중"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
