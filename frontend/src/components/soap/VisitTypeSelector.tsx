import { Button } from "@/components/ui/button"
import { useSoapStore } from "@/hooks/useSoapStore"
import type { VisitType } from "@/types"

const OPTIONS: VisitType[] = ["초진", "재진"]

export function VisitTypeSelector() {
  const visitType = useSoapStore((s) => s.visitType)
  const setVisitType = useSoapStore((s) => s.setVisitType)

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-gray-500">방문 유형:</span>
      {OPTIONS.map((opt) => (
        <Button
          key={opt}
          variant={visitType === opt ? "default" : "outline"}
          size="xs"
          onClick={() => setVisitType(opt)}
        >
          {opt}
        </Button>
      ))}
    </div>
  )
}
