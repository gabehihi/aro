import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { SectionShell, ToggleLabel } from "./SectionShell"

export function OsteoporosisSection() {
  const op = useSoapStore((s) => s.chronic.op)
  const labs = useSoapStore((s) => s.chronic.labs)
  const updateForm = useSoapStore((s) => s.updateChronicForm)
  const updateLabs = useSoapStore((s) => s.updateChronicLabs)

  return (
    <SectionShell title="# 골다공증 (OP)" badge="M81.9">
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <Label className="text-xs text-gray-600">T-score (Spine)</Label>
          <Input
            inputMode="decimal"
            value={labs.tscore_spine}
            onChange={(e) => updateLabs({ tscore_spine: e.target.value })}
            placeholder="예: -2.8"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">T-score (Hip)</Label>
          <Input
            inputMode="decimal"
            value={labs.tscore_hip}
            onChange={(e) => updateLabs({ tscore_hip: e.target.value })}
            placeholder="예: -2.4"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-600">직전 DEXA 일자</Label>
        <Input
          type="date"
          value={op.last_dexa_date}
          onChange={(e) => updateForm("op", { last_dexa_date: e.target.value })}
        />
      </div>
      <ToggleLabel
        checked={op.calcium_intake_adequate}
        onChange={(v) => updateForm("op", { calcium_intake_adequate: v })}
      >
        칼슘/비타민D 섭취 충분
      </ToggleLabel>
    </SectionShell>
  )
}
