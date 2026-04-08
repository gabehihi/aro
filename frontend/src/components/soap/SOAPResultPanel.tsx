import { useSoapStore } from "@/hooks/useSoapStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const SECTIONS = [
  { key: "subjective", label: "S (Subjective)", color: "border-l-blue-500" },
  { key: "objective", label: "O (Objective)", color: "border-l-green-500" },
  { key: "assessment", label: "A (Assessment)", color: "border-l-amber-500" },
  { key: "plan", label: "P (Plan)", color: "border-l-purple-500" },
] as const

export function SOAPResultPanel() {
  const { soapResult, updateSoapField } = useSoapStore()

  if (!soapResult) return null

  return (
    <div className="space-y-3">
      {SECTIONS.map((section) => (
        <Card key={section.key} className={`border-l-4 ${section.color}`}>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm">{section.label}</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <textarea
              value={soapResult[section.key]}
              onChange={(e) => updateSoapField(section.key, e.target.value)}
              rows={3}
              className="w-full resize-y rounded border border-gray-200 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
