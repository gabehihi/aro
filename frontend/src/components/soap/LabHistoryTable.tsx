import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ClinicalSummary } from "@/types"

const KEY_LABS: { key: string; label: string }[] = [
  { key: "hba1c", label: "HbA1c" },
  { key: "fbs", label: "FBS" },
  { key: "ldl", label: "LDL" },
  { key: "hdl", label: "HDL" },
  { key: "tg", label: "TG" },
  { key: "tc", label: "T-Chol" },
  { key: "tsh", label: "TSH" },
  { key: "ft4", label: "fT4" },
  { key: "ast", label: "AST" },
  { key: "alt", label: "ALT" },
  { key: "cr", label: "Cr" },
  { key: "egfr", label: "eGFR" },
]

interface Props {
  recentLabs: ClinicalSummary["recent_labs"]
}

export function LabHistoryTable({ recentLabs }: Props) {
  if (recentLabs.length === 0) return null

  // Find which columns have at least one value
  const activeCols = KEY_LABS.filter((col) =>
    recentLabs.some((entry) => {
      const labs = (entry as Record<string, unknown>).labs as Record<string, unknown> | undefined
      return labs && labs[col.key] != null && labs[col.key] !== ""
    }),
  )

  if (activeCols.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">검사 이력</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-2 py-1.5 text-left font-medium text-gray-600 whitespace-nowrap">날짜</th>
                {activeCols.map((col) => (
                  <th key={col.key} className="px-2 py-1.5 text-right font-medium text-gray-600 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLabs.map((entry, i) => {
                const e = entry as Record<string, unknown>
                const labs = e.labs as Record<string, unknown> | undefined
                const date = (e.date as string | undefined)?.slice(0, 10) ?? ""
                return (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{date.slice(5)}</td>
                    {activeCols.map((col) => {
                      const val = labs?.[col.key]
                      return (
                        <td key={col.key} className="px-2 py-1 text-right text-gray-700 whitespace-nowrap">
                          {val != null && val !== "" ? String(val) : ""}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
