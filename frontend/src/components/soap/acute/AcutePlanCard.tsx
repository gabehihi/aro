import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { SectionShell, ToggleLabel } from "../chronic/SectionShell"

export function AcutePlanCard() {
  const plan = useSoapStore((s) => s.acute.plan)
  const updatePlan = useSoapStore((s) => s.updateAcutePlan)

  return (
    <SectionShell title="급성 계획 / Plan">
      <ToggleLabel
        checked={plan.antibiotics}
        onChange={(antibiotics) => updatePlan({ antibiotics })}
      >
        항생제 포함하여 약물 복용
      </ToggleLabel>
      <ToggleLabel
        checked={plan.revisit}
        onChange={(revisit) => updatePlan({ revisit })}
      >
        호전 없거나 증상 악화 시 재내원
      </ToggleLabel>
      <ToggleLabel
        checked={plan.hydration}
        onChange={(hydration) => updatePlan({ hydration })}
      >
        적절한 수분 섭취 격려
      </ToggleLabel>

      <div>
        <Label className="text-xs text-gray-600">추가 계획</Label>
        <textarea
          value={plan.extra}
          onChange={(e) => updatePlan({ extra: e.target.value })}
          className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
          placeholder="예: 3일 후 경과 관찰"
          spellCheck={false}
        />
      </div>
    </SectionShell>
  )
}
