import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"

export function AdditionalLabsCard() {
  const labs = useSoapStore((s) => s.chronic.labs)
  const otherLabs = useSoapStore((s) => s.chronic.otherLabs)
  const updateLabs = useSoapStore((s) => s.updateChronicLabs)
  const addOtherLab = useSoapStore((s) => s.addOtherLab)
  const updateOtherLab = useSoapStore((s) => s.updateOtherLab)
  const removeOtherLab = useSoapStore((s) => s.removeOtherLab)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm">추가 검사</CardTitle>
          <p className="text-xs text-gray-500">Vit D, Hb, 자유 검사값을 Objective에 포함합니다.</p>
        </div>
        <Button type="button" variant="outline" size="xs" onClick={addOtherLab}>
          <Plus className="h-3.5 w-3.5" />
          검사 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-xs text-gray-600">Vit D (ng/mL)</Label>
            <Input
              inputMode="decimal"
              value={labs.vitd}
              onChange={(e) => updateLabs({ vitd: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">Hb (g/dL)</Label>
            <Input
              inputMode="decimal"
              value={labs.hb}
              onChange={(e) => updateLabs({ hb: e.target.value })}
            />
          </div>
        </div>

        {otherLabs.length > 0 ? (
          <div className="space-y-1.5">
            {otherLabs.map((lab, index) => (
              <div
                key={`${index}-${lab.name}`}
                className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5"
              >
                <Input
                  value={lab.name}
                  onChange={(e) => updateOtherLab(index, { name: e.target.value })}
                  placeholder="검사명"
                />
                <Input
                  inputMode="decimal"
                  value={lab.value}
                  onChange={(e) => updateOtherLab(index, { value: e.target.value })}
                  placeholder="값"
                />
                <Input
                  value={lab.unit}
                  onChange={(e) => updateOtherLab(index, { unit: e.target.value })}
                  placeholder="단위"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => removeOtherLab(index)}
                  aria-label="기타 검사 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">추가로 저장할 자유 검사값이 있으면 행을 추가하세요.</p>
        )}
      </CardContent>
    </Card>
  )
}
