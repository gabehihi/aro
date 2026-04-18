import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { SectionShell } from "./SectionShell"

interface Props {
  variant: "HypoT" | "HyperT"
}

export function ThyroidSection({ variant }: Props) {
  const thyroid = useSoapStore((s) => s.chronic.thyroid)
  const labs = useSoapStore((s) => s.chronic.labs)
  const updateForm = useSoapStore((s) => s.updateChronicForm)
  const updateLabs = useSoapStore((s) => s.updateChronicLabs)

  const title =
    variant === "HypoT"
      ? "# 갑상선기능저하증 (Hypothyroidism)"
      : "# 갑상선기능항진증 (Hyperthyroidism)"
  const badge = variant === "HypoT" ? "E03.9" : "E05.9"

  return (
    <SectionShell title={title} badge={badge}>
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <Label className="text-xs text-gray-600">TSH</Label>
          <Input
            inputMode="decimal"
            value={labs.tsh}
            onChange={(e) => updateLabs({ tsh: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">fT4</Label>
          <Input
            inputMode="decimal"
            value={labs.ft4}
            onChange={(e) => updateLabs({ ft4: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-600">복용 중 약물</Label>
        <Input
          value={thyroid.medication}
          onChange={(e) =>
            updateForm("thyroid", { medication: e.target.value })
          }
          placeholder={
            variant === "HypoT"
              ? "예: Synthyroid 50mcg qd"
              : "예: Methimazole 10mg bid"
          }
        />
      </div>
    </SectionShell>
  )
}
