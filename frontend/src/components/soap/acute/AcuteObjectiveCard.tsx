import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSoapStore } from "@/hooks/useSoapStore"
import { SectionShell } from "../chronic/SectionShell"

const APPEARANCE_OPTIONS = [
  "Acute ill-looking",
  "Chronic ill-looking",
  "Not so ill-looking",
] as const

const PI_OPTIONS = ["-", "+", "++", "+++"] as const
const BREATH_BASE_OPTIONS = ["Clear", "Coarse"] as const
const BREATH_EXTRA_OPTIONS = [
  "without",
  "with crackle",
  "with wheezing",
  "with crackle & wheezing",
] as const
const ABD_SOFT_OPTIONS = ["Soft", "Rigid"] as const
const ABD_SHAPE_OPTIONS = ["Flat", "Obese", "Distended"] as const
const ABD_BS_OPTIONS = ["normoactive", "hypoactive", "hyperactive"] as const
const TENDERNESS_OPTIONS = ["no", "Td (+)"] as const
const CVAT_OPTIONS = ["Neg", "Pos"] as const

function SegmentGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          variant={value === option ? "default" : "outline"}
          size="xs"
          onClick={() => onChange(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  )
}

export function AcuteObjectiveCard() {
  const objective = useSoapStore((s) => s.acute.objective)
  const chronicVitals = useSoapStore((s) => s.chronic.vitals)
  const updateObjective = useSoapStore((s) => s.updateAcuteObjective)

  const hasChronicVitals = [chronicVitals.sbp, chronicVitals.dbp, chronicVitals.hr, chronicVitals.bt]
    .some((value) => value.trim().length > 0)

  return (
    <SectionShell title="급성 진찰 / Objective">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-600">활력 징후</Label>
          {hasChronicVitals ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() =>
                updateObjective({
                  vitals: {
                    sbp: chronicVitals.sbp,
                    dbp: chronicVitals.dbp,
                    hr: chronicVitals.hr,
                    bt: chronicVitals.bt,
                  },
                })
              }
            >
              만성 V/S 가져오기
            </Button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <div>
            <Label className="text-xs text-gray-600">SBP</Label>
            <Input
              inputMode="decimal"
              value={objective.vitals.sbp}
              onChange={(e) =>
                updateObjective({ vitals: { sbp: e.target.value } })
              }
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">DBP</Label>
            <Input
              inputMode="decimal"
              value={objective.vitals.dbp}
              onChange={(e) =>
                updateObjective({ vitals: { dbp: e.target.value } })
              }
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">HR</Label>
            <Input
              inputMode="decimal"
              value={objective.vitals.hr}
              onChange={(e) =>
                updateObjective({ vitals: { hr: e.target.value } })
              }
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">BT</Label>
            <Input
              inputMode="decimal"
              value={objective.vitals.bt}
              onChange={(e) =>
                updateObjective({ vitals: { bt: e.target.value } })
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-gray-600">전반 상태</Label>
        <SegmentGroup
          options={APPEARANCE_OPTIONS}
          value={objective.appearance}
          onChange={(appearance) => updateObjective({ appearance })}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">PI</Label>
          <SegmentGroup
            options={PI_OPTIONS}
            value={objective.pi}
            onChange={(pi) => updateObjective({ pi })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">PTH</Label>
          <SegmentGroup
            options={PI_OPTIONS}
            value={objective.pth}
            onChange={(pth) => updateObjective({ pth })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div>
          <Label className="text-xs text-gray-600">호흡음 기본</Label>
          <SegmentGroup
            options={BREATH_BASE_OPTIONS}
            value={objective.breath_base}
            onChange={(breath_base) => updateObjective({ breath_base })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">호흡음 추가</Label>
          <SegmentGroup
            options={BREATH_EXTRA_OPTIONS}
            value={objective.breath_extra}
            onChange={(breath_extra) => updateObjective({ breath_extra })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div>
          <Label className="text-xs text-gray-600">복부 긴장도</Label>
          <SegmentGroup
            options={ABD_SOFT_OPTIONS}
            value={objective.abd_soft}
            onChange={(abd_soft) => updateObjective({ abd_soft })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">복부 형태</Label>
          <SegmentGroup
            options={ABD_SHAPE_OPTIONS}
            value={objective.abd_shape}
            onChange={(abd_shape) => updateObjective({ abd_shape })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">장음</Label>
          <SegmentGroup
            options={ABD_BS_OPTIONS}
            value={objective.abd_bs}
            onChange={(abd_bs) => updateObjective({ abd_bs })}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">복부 압통</Label>
          <SegmentGroup
            options={TENDERNESS_OPTIONS}
            value={objective.abd_td}
            onChange={(abd_td) => updateObjective({ abd_td })}
          />
          {objective.abd_td === "Td (+)" ? (
            <Input
              className="mt-2"
              value={objective.abd_td_location}
              onChange={(e) =>
                updateObjective({ abd_td_location: e.target.value })
              }
              placeholder="예: RLQ, epigastric"
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <div>
          <Label className="text-xs text-gray-600">CVAT</Label>
          <SegmentGroup
            options={CVAT_OPTIONS}
            value={objective.cvat}
            onChange={(cvat) => updateObjective({ cvat })}
          />
        </div>
        {objective.cvat === "Pos" ? (
          <Input
            value={objective.cvat_detail}
            onChange={(e) => updateObjective({ cvat_detail: e.target.value })}
            placeholder="세부 소견"
          />
        ) : null}
      </div>

      <div>
        <Label className="text-xs text-gray-600">기타 소견</Label>
        <Input
          value={objective.extra}
          onChange={(e) => updateObjective({ extra: e.target.value })}
          placeholder="예: tonsil exudate, wheezing"
        />
      </div>
    </SectionShell>
  )
}
