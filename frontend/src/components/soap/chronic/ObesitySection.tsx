import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { SectionShell } from "./SectionShell"

export function ObesitySection() {
  const ob = useSoapStore((s) => s.chronic.ob)
  const update = useSoapStore((s) => s.updateChronicForm)

  return (
    <SectionShell title="# 비만 (Obesity)" badge="E66.9">
      <div>
        <Label className="text-xs text-gray-600">목표 체중 (kg)</Label>
        <Input
          inputMode="decimal"
          value={ob.goal_weight}
          onChange={(e) => update("ob", { goal_weight: e.target.value })}
        />
      </div>
    </SectionShell>
  )
}
