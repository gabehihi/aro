import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useSoapStore } from "@/hooks/useSoapStore"
import { EDUCATION_OPTIONS } from "@/utils/soap/templates/education"

export function EducationChecklist() {
  const education = useSoapStore((s) => s.chronic.education)
  const update = useSoapStore((s) => s.updateChronicForm)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">교육</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-1.5">
          {EDUCATION_OPTIONS.map(({ key, label }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-2 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="checkbox"
                checked={Boolean(education[key])}
                onChange={(e) =>
                  update("education", { [key]: e.target.checked })
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div className="mt-2">
          <Label className="text-xs text-gray-600">기타 교육</Label>
          <Input
            value={education.extra}
            onChange={(e) => update("education", { extra: e.target.value })}
            placeholder="예: 저염식 샘플 제공"
          />
        </div>
      </CardContent>
    </Card>
  )
}
