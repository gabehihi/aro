import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

interface Props {
  generatedText: string
  warnings: { type: string; message: string; severity: string; location?: string }[]
}

export function DocumentPreview({ generatedText, warnings }: Props) {
  if (!generatedText) return null

  const subjectiveLocations = warnings
    .filter((w) => w.type === "subjective_expression")
    .map((w) => w.location ?? "")

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          문서 미리보기
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded border bg-white p-4 text-sm leading-relaxed">
          {generatedText.split("\n").map((line, i) => {
            const hasSubjective = subjectiveLocations.length > 0 && warnings.some(
              (w) => w.type === "subjective_expression" && line.includes(w.message.split("'")[1] ?? "")
            )
            return (
              <p
                key={i}
                className={hasSubjective ? "bg-amber-100 px-1 rounded" : ""}
              >
                {line || "\u00A0"}
              </p>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
