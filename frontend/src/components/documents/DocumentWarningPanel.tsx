import { AlertTriangle, XCircle } from "lucide-react"
import type { Warning } from "@/types"

interface Props {
  warnings: Warning[]
}

export function DocumentWarningPanel({ warnings }: Props) {
  if (warnings.length === 0) return null

  const errors = warnings.filter((w) => w.severity === "error")
  const warns = warnings.filter((w) => w.severity === "warning")

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-3">
          <h4 className="flex items-center gap-1 text-sm font-semibold text-red-700">
            <XCircle className="h-4 w-4" />
            오류 ({errors.length})
          </h4>
          <ul className="mt-1 space-y-1">
            {errors.map((w, i) => (
              <li key={i} className="text-xs text-red-600">
                [{w.type}] {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {warns.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3">
          <h4 className="flex items-center gap-1 text-sm font-semibold text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            경고 ({warns.length})
          </h4>
          <ul className="mt-1 space-y-1">
            {warns.map((w, i) => (
              <li key={i} className="text-xs text-amber-600">
                [{w.type}] {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
