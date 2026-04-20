import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { usePatientContext } from "@/hooks/useSoapSelectors"
import { calcEGFR } from "@/utils/soap/egfr"
import { getCKDStage } from "@/utils/soap/ckd-stage"
import { LabHint } from "./LabHint"
import { SectionShell, ToggleLabel } from "./SectionShell"

export function CKDSection() {
  const ckd = useSoapStore((s) => s.chronic.ckd)
  const labs = useSoapStore((s) => s.chronic.labs)
  const updateForm = useSoapStore((s) => s.updateChronicForm)
  const updateLabs = useSoapStore((s) => s.updateChronicLabs)
  const patient = usePatientContext()

  const cr = parseFloat(labs.cr) || null
  const egfr = calcEGFR(cr, patient.age, patient.sex)
  const stage = getCKDStage(egfr)

  return (
    <SectionShell title="# 만성콩팥병 (CKD)" badge="N18.9">
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <Label className="text-xs text-gray-600">Creatinine (mg/dL)</Label>
          <Input
            inputMode="decimal"
            value={labs.cr}
            onChange={(e) => updateLabs({ cr: e.target.value })}
          />
          <LabHint labKey="cr" onLoad={(v) => updateLabs({ cr: v })} />
        </div>
        <div>
          <Label className="text-xs text-gray-600">BUN (mg/dL)</Label>
          <Input
            inputMode="decimal"
            value={labs.bun}
            onChange={(e) => updateLabs({ bun: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">ACR (mg/g)</Label>
          <Input
            inputMode="decimal"
            value={labs.acr}
            onChange={(e) => updateLabs({ acr: e.target.value })}
          />
        </div>
      </div>
      {egfr !== null ? (
        <p className="text-xs text-gray-600">
          eGFR {egfr} mL/min/1.73m²
          {stage ? (
            <span className="ml-1 text-gray-500">
              ({stage.stage} — {stage.label})
            </span>
          ) : null}
        </p>
      ) : (
        <p className="text-xs text-gray-400">
          Cr + 환자 성별/연령 있으면 eGFR 자동 계산
        </p>
      )}
      <div>
        <Label className="text-xs text-gray-600">검사일</Label>
        <Input
          type="date"
          value={ckd.labs_date}
          onChange={(e) => updateForm("ckd", { labs_date: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs text-gray-600">원인</Label>
        <Input
          value={ckd.etiology}
          onChange={(e) => updateForm("ckd", { etiology: e.target.value })}
          placeholder="DMN / HTN nephropathy / ..."
        />
      </div>
      <ToggleLabel
        checked={ckd.is_dialysis}
        onChange={(v) => updateForm("ckd", { is_dialysis: v })}
      >
        투석 중
      </ToggleLabel>
    </SectionShell>
  )
}
