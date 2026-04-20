import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { LabHint } from "./LabHint"
import { SectionShell } from "./SectionShell"

export function MASLDSection() {
  const masld = useSoapStore((s) => s.chronic.masld)
  const labs = useSoapStore((s) => s.chronic.labs)
  const updateForm = useSoapStore((s) => s.updateChronicForm)
  const updateLabs = useSoapStore((s) => s.updateChronicLabs)

  return (
    <SectionShell title="# 대사연관지방간질환 (MASLD)" badge="K76.0">
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <Label className="text-xs text-gray-600">AST</Label>
          <Input
            inputMode="numeric"
            value={labs.ast}
            onChange={(e) => updateLabs({ ast: e.target.value })}
          />
          <LabHint labKey="ast" onLoad={(v) => updateLabs({ ast: v })} />
        </div>
        <div>
          <Label className="text-xs text-gray-600">ALT</Label>
          <Input
            inputMode="numeric"
            value={labs.alt}
            onChange={(e) => updateLabs({ alt: e.target.value })}
          />
          <LabHint labKey="alt" onLoad={(v) => updateLabs({ alt: v })} />
        </div>
        <div>
          <Label className="text-xs text-gray-600">GGT</Label>
          <Input
            inputMode="numeric"
            value={labs.ggt}
            onChange={(e) => updateLabs({ ggt: e.target.value })}
          />
          <LabHint labKey="ggt" onLoad={(v) => updateLabs({ ggt: v })} />
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-600">FIB-4 (선택)</Label>
        <Input
          inputMode="decimal"
          value={masld.fib4}
          onChange={(e) => updateForm("masld", { fib4: e.target.value })}
          placeholder="예: 1.3 / 2.67"
        />
      </div>
    </SectionShell>
  )
}
