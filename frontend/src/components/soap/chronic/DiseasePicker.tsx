import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSoapStore } from "@/hooks/useSoapStore"
import { DISEASES, DISEASE_ORDER } from "@/utils/soap/diseases"
import type { DiseaseId } from "@/utils/soap/types"

export function DiseasePicker() {
  const selected = useSoapStore((s) => s.chronic.selectedDiseases)
  const activeDisease = useSoapStore((s) => s.activeChronicDisease)
  const toggle = useSoapStore((s) => s.toggleDisease)
  const setActiveDisease = useSoapStore((s) => s.setActiveChronicDisease)

  function handleClick(id: DiseaseId) {
    if (!selected.includes(id)) {
      toggle(id) // select + activate
    } else if (activeDisease !== id) {
      setActiveDisease(id) // just switch active
    } else {
      toggle(id) // deselect
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">질환 선택</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {DISEASE_ORDER.map((id: DiseaseId) => {
            const meta = DISEASES[id]
            const isSelected = selected.includes(id)
            const isActive = activeDisease === id
            return (
              <Button
                key={id}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="xs"
                onClick={() => handleClick(id)}
                title={meta.kcdCode}
                className={isActive ? "ring-2 ring-offset-1 ring-primary/40" : undefined}
              >
                {meta.label}
              </Button>
            )
          })}
        </div>
        {selected.length > 0 && (
          <p className="mt-1.5 text-[10px] text-gray-400">
            입력 중: {activeDisease ? DISEASES[activeDisease].label : "-"} · 선택된 질환 클릭 시 전환, 현재 활성 질환 클릭 시 제거
          </p>
        )}
      </CardContent>
    </Card>
  )
}
