import { AlertTriangle, XCircle } from "lucide-react"
import { useSoapStore } from "@/hooks/useSoapStore"

export function WarningBanner() {
  const { soapResult } = useSoapStore()

  if (!soapResult || soapResult.warnings.length === 0) return null

  const errors = soapResult.warnings.filter((w) => w.severity === "error")
  const warnings = soapResult.warnings.filter((w) => w.severity === "warning")

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-800">
              Hallucination Guard ({errors.length})
            </span>
          </div>
          <ul className="space-y-1 pl-6">
            {errors.map((w, i) => (
              <li key={i} className="text-xs text-red-700 list-disc">
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              경고 ({warnings.length})
            </span>
          </div>
          <ul className="space-y-1 pl-6">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 list-disc">
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
