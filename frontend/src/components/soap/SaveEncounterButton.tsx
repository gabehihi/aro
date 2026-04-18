import { Check, Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useSoapStore } from "@/hooks/useSoapStore"
import { useComposedSoap, useKCDCodesForSave } from "@/hooks/useSoapSelectors"
import { saveEncounter } from "@/api/encounters"
import { bmiCategory, calcBMI } from "@/utils/soap/bmi"
import { buildSoapRawInput } from "@/utils/soap/rawInput"
import type { ChronicState } from "@/utils/soap/types"
import type { HealthPromotion, Lab, Vitals } from "@/types"

function toNum(v: string): number | null {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

function vitalsFromState(
  chronic: ChronicState,
  acuteVitals: { sbp: string; dbp: string; hr: string; bt: string },
): Vitals | null {
  const { sbp, dbp, hr, bt, rr, spo2, bw, bh, waist } = chronic.vitals
  const bwN = toNum(bw)
  const bhN = toNum(bh)
  const bmi = calcBMI(bwN, bhN)
  const values = {
    sbp: toNum(sbp) ?? toNum(acuteVitals.sbp),
    dbp: toNum(dbp) ?? toNum(acuteVitals.dbp),
    hr: toNum(hr) ?? toNum(acuteVitals.hr),
    bt: toNum(bt) ?? toNum(acuteVitals.bt),
    rr: toNum(rr),
    spo2: toNum(spo2),
    bw: bwN,
    bh: bhN,
    waist: toNum(waist),
    bmi,
  }
  const hasAny = Object.values(values).some((v) => v !== null)
  return hasAny ? values : null
}

const LAB_META: Record<string, { name: string; unit: string }> = {
  hba1c: { name: "HbA1c", unit: "%" },
  fbs: { name: "FBS", unit: "mg/dL" },
  ppg: { name: "PPG", unit: "mg/dL" },
  ldl: { name: "LDL", unit: "mg/dL" },
  hdl: { name: "HDL", unit: "mg/dL" },
  tg: { name: "TG", unit: "mg/dL" },
  tc: { name: "T-Chol", unit: "mg/dL" },
  ast: { name: "AST", unit: "U/L" },
  alt: { name: "ALT", unit: "U/L" },
  ggt: { name: "GGT", unit: "U/L" },
  cr: { name: "Cr", unit: "mg/dL" },
  bun: { name: "BUN", unit: "mg/dL" },
  acr: { name: "ACR", unit: "mg/g" },
  tsh: { name: "TSH", unit: "mIU/L" },
  ft4: { name: "fT4", unit: "ng/dL" },
  vitd: { name: "Vit D", unit: "ng/mL" },
  hb: { name: "Hb", unit: "g/dL" },
  tscore_spine: { name: "T-score(Spine)", unit: "" },
  tscore_hip: { name: "T-score(Hip)", unit: "" },
}

function labsFromChronic(chronic: ChronicState): Lab[] {
  const out: Lab[] = []
  for (const [key, raw] of Object.entries(chronic.labs)) {
    const value = toNum(raw as string)
    if (value === null) continue
    const meta = LAB_META[key]
    if (!meta) continue
    out.push({ name: meta.name, value, unit: meta.unit, flag: null })
  }
  for (const lab of chronic.otherLabs) {
    const value = toNum(lab.value)
    const name = lab.name.trim()
    if (value === null || name.length === 0) continue
    out.push({ name, value, unit: lab.unit.trim(), flag: null })
  }
  return out
}

function healthPromotionFromChronic(chronic: ChronicState): HealthPromotion {
  return {
    smoking_cessation: chronic.education.smoking_cessation,
    alcohol_reduction: chronic.education.alcohol_reduction,
    exercise: chronic.education.exercise,
    diet: chronic.education.diet,
  }
}

export function SaveEncounterButton() {
  const selectedPatient = useSoapStore((s) => s.selectedPatient)
  const visitType = useSoapStore((s) => s.visitType)
  const chronic = useSoapStore((s) => s.chronic)
  const acute = useSoapStore((s) => s.acute)
  const mode = useSoapStore((s) => s.mode)
  const manualOverrides = useSoapStore((s) => s.manualOverrides)
  const isSaving = useSoapStore((s) => s.isSaving)
  const setIsSaving = useSoapStore((s) => s.setIsSaving)
  const setError = useSoapStore((s) => s.setError)
  const resetForNewPatient = useSoapStore((s) => s.resetForNewPatient)
  const composed = useComposedSoap()
  const kcdCodes = useKCDCodesForSave()
  const [saved, setSaved] = useState(false)

  const noContent =
    !composed.s && !composed.o && !composed.a && !composed.p
  const disabled = !selectedPatient || noContent || isSaving || saved
  const rawSnapshot = {
    mode,
    chronic,
    acute,
    overrides: manualOverrides,
  }
  const rawInput = buildSoapRawInput(rawSnapshot)
  const bmiBadge = (() => {
    const bmi = calcBMI(toNum(chronic.vitals.bw), toNum(chronic.vitals.bh))
    const cat = bmiCategory(bmi)
    return cat ? ` [${cat}]` : ""
  })()

  async function handleSave() {
    if (!selectedPatient) return

    setIsSaving(true)
    setError(null)

    try {
      await saveEncounter({
        patient_id: selectedPatient.id,
        raw_input: rawInput,
        visit_type: visitType,
        encounter_date: new Date().toISOString(),
        subjective: composed.s,
        objective: composed.o + (bmiBadge && composed.o ? "" : ""),
        assessment: composed.a,
        plan: composed.p,
        vitals: vitalsFromState(chronic, acute.objective.vitals),
        kcd_codes: kcdCodes,
        labs: labsFromChronic(chronic),
        health_promotion: healthPromotionFromChronic(chronic),
      })
      setSaved(true)
      setTimeout(() => {
        resetForNewPatient()
        setSaved(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Button
      onClick={handleSave}
      disabled={disabled}
      className={`w-full ${saved ? "bg-green-600 hover:bg-green-600" : ""}`}
      size="default"
    >
      {saved ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          저장 완료
        </>
      ) : isSaving ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          저장 중...
        </>
      ) : (
        "진료 기록 저장"
      )}
    </Button>
  )
}
