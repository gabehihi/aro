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

export function DLSection() {
  const dl = useSoapStore((s) => s.chronic.dl)
  const labs = useSoapStore((s) => s.chronic.labs)
  const updateForm = useSoapStore((s) => s.updateChronicForm)
  const updateLabs = useSoapStore((s) => s.updateChronicLabs)

  useEffect(() => {
    if (!dl.labs_date) updateForm("dl", { labs_date: todayISO() })
  }, [dl.labs_date, updateForm])

  return (
    <SectionShell title="# 이상지질혈증 (Dyslipidemia)" badge="E78.5">
      <div>
        <Label className="text-xs text-gray-600">검사일</Label>
        <Input
          type="date"
          value={dl.labs_date}
          onChange={(e) => updateForm("dl", { labs_date: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <div>
          <Label className="text-xs text-gray-600">LDL</Label>
          <Input
            inputMode="numeric"
            value={labs.ldl}
            onChange={(e) => updateLabs({ ldl: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">HDL</Label>
          <Input
            inputMode="numeric"
            value={labs.hdl}
            onChange={(e) => updateLabs({ hdl: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">TG</Label>
          <Input
            inputMode="numeric"
            value={labs.tg}
            onChange={(e) => updateLabs({ tg: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">T-Chol</Label>
          <Input
            inputMode="numeric"
            value={labs.tc}
            onChange={(e) => updateLabs({ tc: e.target.value })}
          />
        </div>
      </div>
      <ToggleLabel
        checked={dl.has_ascvd_history}
        onChange={(v) => updateForm("dl", { has_ascvd_history: v })}
      >
        ASCVD 병력 (초고위험군)
      </ToggleLabel>
      <div className="grid grid-cols-3 gap-1.5">
        <ToggleLabel
          checked={dl.rf_smoking}
          onChange={(v) => updateForm("dl", { rf_smoking: v })}
        >
          흡연
        </ToggleLabel>
        <ToggleLabel
          checked={dl.rf_family_history}
          onChange={(v) => updateForm("dl", { rf_family_history: v })}
        >
          조기관상동맥가족력
        </ToggleLabel>
        <ToggleLabel
          checked={dl.rf_hdl_low}
          onChange={(v) => updateForm("dl", { rf_hdl_low: v })}
        >
          저HDL
        </ToggleLabel>
        <ToggleLabel
          checked={dl.rf_htn}
          onChange={(v) => updateForm("dl", { rf_htn: v })}
        >
          고혈압 동반
        </ToggleLabel>
        <ToggleLabel
          checked={dl.rf_age}
          onChange={(v) => updateForm("dl", { rf_age: v })}
        >
          연령 위험 (♂45 / ♀55)
        </ToggleLabel>
      </div>
    </SectionShell>
  )
}
