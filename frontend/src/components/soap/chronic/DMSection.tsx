import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { SectionShell, ToggleLabel } from "./SectionShell"

function todayISO(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function DMSection() {
  const dm = useSoapStore((s) => s.chronic.dm)
  const labs = useSoapStore((s) => s.chronic.labs)
  const updateForm = useSoapStore((s) => s.updateChronicForm)
  const updateLabs = useSoapStore((s) => s.updateChronicLabs)

  useEffect(() => {
    if (!dm.labs_date) updateForm("dm", { labs_date: todayISO() })
  }, [dm.labs_date, updateForm])

  return (
    <SectionShell title="# 당뇨병 (DM)" badge="E11.9">
      <div>
        <Label className="text-xs text-gray-600">검사일</Label>
        <Input
          type="date"
          value={dm.labs_date}
          onChange={(e) => updateForm("dm", { labs_date: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <Label className="text-xs text-gray-600">HbA1c (%)</Label>
          <Input
            inputMode="decimal"
            value={labs.hba1c}
            onChange={(e) => updateLabs({ hba1c: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">FBS (mg/dL)</Label>
          <Input
            inputMode="decimal"
            value={labs.fbs}
            onChange={(e) => updateLabs({ fbs: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">PPG (mg/dL)</Label>
          <Input
            inputMode="decimal"
            value={labs.ppg}
            onChange={(e) => updateLabs({ ppg: e.target.value })}
          />
        </div>
      </div>
      <ToggleLabel
        checked={dm.home_glucose_measured}
        onChange={(v) => updateForm("dm", { home_glucose_measured: v })}
      >
        자가혈당 측정함
      </ToggleLabel>
      {dm.home_glucose_measured ? (
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-xs text-gray-600">자가 FBS</Label>
            <Input
              inputMode="numeric"
              value={dm.home_fbs}
              onChange={(e) => updateForm("dm", { home_fbs: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">자가 PPG</Label>
            <Input
              inputMode="numeric"
              value={dm.home_ppg}
              onChange={(e) => updateForm("dm", { home_ppg: e.target.value })}
            />
          </div>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <ToggleLabel
          checked={dm.has_hypo}
          onChange={(v) => updateForm("dm", { has_hypo: v })}
        >
          저혈당 증상 있음
        </ToggleLabel>
        {dm.has_hypo ? (
          <div>
            <Label className="text-xs text-gray-600">주관적 증상</Label>
            <Input
              value={dm.hypo_detail}
              onChange={(e) => updateForm("dm", { hypo_detail: e.target.value })}
              placeholder="예: 식전 발한, 떨림, 주 2회"
            />
          </div>
        ) : null}
      </div>
      <ToggleLabel
        checked={dm.insulin_used}
        onChange={(v) => updateForm("dm", { insulin_used: v })}
      >
        인슐린 사용 중
      </ToggleLabel>
      {dm.insulin_used ? (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label className="text-xs text-gray-600">기저 인슐린 (이름)</Label>
              <Input
                value={dm.insulin_basal_name}
                onChange={(e) =>
                  updateForm("dm", { insulin_basal_name: e.target.value })
                }
                placeholder="예: 란투스, 투제오"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">기저 용량 (U)</Label>
              <Input
                inputMode="numeric"
                value={dm.insulin_basal}
                onChange={(e) =>
                  updateForm("dm", { insulin_basal: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600">식사 인슐린 (이름)</Label>
            <Input
              value={dm.insulin_meal_name}
              onChange={(e) =>
                updateForm("dm", { insulin_meal_name: e.target.value })
              }
              placeholder="예: 노보래피드, 휴마로그"
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <Label className="text-xs text-gray-600">아침 (U)</Label>
              <Input
                inputMode="numeric"
                value={dm.insulin_am}
                onChange={(e) => updateForm("dm", { insulin_am: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">점심 (U)</Label>
              <Input
                inputMode="numeric"
                value={dm.insulin_md}
                onChange={(e) => updateForm("dm", { insulin_md: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">저녁 (U)</Label>
              <Input
                inputMode="numeric"
                value={dm.insulin_pm}
                onChange={(e) => updateForm("dm", { insulin_pm: e.target.value })}
              />
            </div>
          </div>
        </div>
      ) : null}
    </SectionShell>
  )
}
