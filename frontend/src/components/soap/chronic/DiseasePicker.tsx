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
  const orderedSelected = DISEASE_ORDER.filter((id) => selected.includes(id))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">질환 선택 (복수, 입력은 1개씩)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {DISEASE_ORDER.map((id: DiseaseId) => {
            const meta = DISEASES[id]
            const selectedDisease = selected.includes(id)
            const focused = activeDisease === id
            return (
              <Button
                key={id}
                variant={selectedDisease ? "default" : "outline"}
                size="xs"
                onClick={() => toggle(id)}
                title={meta.kcdCode}
                className={focused ? "ring-2 ring-primary/25" : undefined}
              >
                {meta.label}
              </Button>
            )
          })}
        </div>
        {orderedSelected.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/40 p-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>현재 입력 중인 질환</span>
              <span>
                {activeDisease ? DISEASES[activeDisease].label : `${orderedSelected.length}개 선택`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {orderedSelected.map((id) => (
                <Button
                  key={`active-${id}`}
                  type="button"
                  variant={activeDisease === id ? "secondary" : "outline"}
                  size="xs"
                  onClick={() => setActiveDisease(id)}
                >
                  {DISEASES[id].label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {selected.includes("HypoT") && selected.includes("HyperT") ? (
          <p className="mt-2 text-xs text-destructive">
            갑상선 저하/항진은 동시에 선택할 수 없습니다.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
