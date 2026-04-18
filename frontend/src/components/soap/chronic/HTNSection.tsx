import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { SectionShell, ToggleLabel } from "./SectionShell"

export function HTNSection() {
  const htn = useSoapStore((s) => s.chronic.htn)
  const update = useSoapStore((s) => s.updateChronicForm)

  return (
    <SectionShell title="# 고혈압 (HTN)" badge="I10">
      <ToggleLabel
        checked={htn.home_bp_measured}
        onChange={(v) => update("htn", { home_bp_measured: v })}
      >
        가정혈압 측정함
      </ToggleLabel>
      {htn.home_bp_measured ? (
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-xs text-gray-600">가정 SBP</Label>
            <Input
              inputMode="numeric"
              value={htn.home_sbp}
              onChange={(e) => update("htn", { home_sbp: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">가정 DBP</Label>
            <Input
              inputMode="numeric"
              value={htn.home_dbp}
              onChange={(e) => update("htn", { home_dbp: e.target.value })}
            />
          </div>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <ToggleLabel
          checked={htn.has_orthostatic}
          onChange={(v) => update("htn", { has_orthostatic: v })}
        >
          기립성 저혈압 증상 있음
        </ToggleLabel>
        {htn.has_orthostatic ? (
          <div>
            <Label className="text-xs text-gray-600">주관적 증상</Label>
            <Input
              value={htn.orthostatic_detail}
              onChange={(e) =>
                update("htn", { orthostatic_detail: e.target.value })
              }
              placeholder="예: 일어날 때 어지럼, 눈앞 캄캄함"
            />
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <ToggleLabel
          checked={htn.has_cardiovascular}
          onChange={(v) => update("htn", { has_cardiovascular: v })}
        >
          심혈관 병력
        </ToggleLabel>
        <ToggleLabel
          checked={htn.has_smoking}
          onChange={(v) => update("htn", { has_smoking: v })}
        >
          흡연
        </ToggleLabel>
        <ToggleLabel
          checked={htn.has_family_history}
          onChange={(v) => update("htn", { has_family_history: v })}
        >
          가족력
        </ToggleLabel>
      </div>
    </SectionShell>
  )
}
