import type { AbnormalFinding } from "@/types"

interface Props {
  findings: AbnormalFinding[]
}

const tierStyle: Record<string, string> = {
  urgent: "text-red-600 font-semibold",
  caution: "text-orange-500 font-semibold",
  normal: "text-green-600",
}

const tierLabel: Record<string, string> = {
  urgent: "🔴 즉시 확인",
  caution: "🟡 추적 관찰",
  normal: "🟢 정상",
}

export function LabResultsTable({ findings }: Props) {
  if (findings.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">이상소견 없음</p>
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-50">
          <th className="text-left px-3 py-2 border border-gray-200">항목</th>
          <th className="text-center px-3 py-2 border border-gray-200">결과값</th>
          <th className="text-center px-3 py-2 border border-gray-200">정상 기준</th>
          <th className="text-center px-3 py-2 border border-gray-200">판정</th>
        </tr>
      </thead>
      <tbody>
        {findings.map((f) => (
          <tr key={f.name} className="hover:bg-gray-50">
            <td className="px-3 py-2 border border-gray-200 font-medium">{f.name}</td>
            <td className="px-3 py-2 border border-gray-200 text-center">
              {f.value} {f.unit}
            </td>
            <td className="px-3 py-2 border border-gray-200 text-center text-gray-500 text-xs">
              {f.ref_range}
            </td>
            <td className={`px-3 py-2 border border-gray-200 text-center ${tierStyle[f.tier]}`}>
              {tierLabel[f.tier] ?? f.tier}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
