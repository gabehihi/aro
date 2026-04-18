import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { SectionShell } from "../chronic/SectionShell"

const QUICK_DX = [
  "Acute pharyngotonsillitis",
  "Acute nasopharyngitis",
  "Acute pharyngitis",
  "Influenza",
  "Acute bronchitis",
  "Pneumonia",
  "Acute sinusitis",
  "Acute gastroenteritis",
  "Infectious enterocolitis",
] as const

export function AcuteAssessmentCard() {
  const diagnosis = useSoapStore((s) => s.acute.assessment.diagnosis)
  const updateAssessment = useSoapStore((s) => s.updateAcuteAssessment)

  return (
    <SectionShell title="급성 진단 / Assessment">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_DX.map((dx) => (
          <Button
            key={dx}
            type="button"
            variant={diagnosis === dx ? "default" : "outline"}
            size="xs"
            onClick={() => updateAssessment({ diagnosis: dx })}
          >
            {dx}
          </Button>
        ))}
      </div>

      <div>
        <Label className="text-xs text-gray-600">진단명</Label>
        <Input
          value={diagnosis}
          onChange={(e) => updateAssessment({ diagnosis: e.target.value })}
          placeholder="예: Acute pharyngotonsillitis"
        />
      </div>
    </SectionShell>
  )
}
