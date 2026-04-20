import { useSoapStore } from "@/hooks/useSoapStore"

interface LabHintProps {
  labKey: string
  onLoad: (value: string) => void
}

export function LabHint({ labKey, onLoad }: LabHintProps) {
  const clinicalSummary = useSoapStore((s) => s.clinicalSummary)
  if (!clinicalSummary) return null

  for (const entry of clinicalSummary.recent_labs) {
    const e = entry as Record<string, unknown>
    const labs = e.labs as Record<string, unknown> | undefined
    const date = e.date as string | undefined
    if (labs && labs[labKey] != null && labs[labKey] !== "") {
      const val = String(labs[labKey])
      const dateStr = date?.slice(5, 10) ?? ""
      return (
        <button
          type="button"
          className="text-[10px] text-blue-500 hover:text-blue-700 cursor-pointer"
          onClick={() => onLoad(val)}
          title="클릭하여 이전값 채우기"
        >
          이전: {val} ({dateStr}) ↑
        </button>
      )
    }
  }
  return null
}
