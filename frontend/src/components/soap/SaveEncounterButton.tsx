import { Check, Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useSoapStore } from "@/hooks/useSoapStore"
import { saveEncounter } from "@/api/soap"

export function SaveEncounterButton() {
  const {
    selectedPatient,
    rawInput,
    visitType,
    soapResult,
    isSaving,
    setIsSaving,
    setError,
    reset,
  } = useSoapStore()
  const [saved, setSaved] = useState(false)

  if (!soapResult) return null

  async function handleSave() {
    if (!selectedPatient || !soapResult) return

    setIsSaving(true)
    setError(null)

    try {
      await saveEncounter({
        patient_id: selectedPatient.id,
        raw_input: rawInput,
        visit_type: visitType,
        encounter_date: new Date().toISOString(),
        subjective: soapResult.subjective,
        objective: soapResult.objective,
        assessment: soapResult.assessment,
        plan: soapResult.plan,
        vitals: soapResult.vitals,
        kcd_codes: soapResult.kcd_codes,
        labs: soapResult.labs,
        health_promotion: soapResult.health_promotion,
      })
      setSaved(true)
      setTimeout(() => {
        reset()
        setSaved(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Button
      onClick={handleSave}
      disabled={isSaving || saved}
      className={`w-full ${saved ? "bg-green-600 hover:bg-green-600" : ""}`}
      size="lg"
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
