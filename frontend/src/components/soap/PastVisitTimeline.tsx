import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PastVisitTimelineProps {
  encounters: Record<string, unknown>[]
}

export function PastVisitTimeline({ encounters }: PastVisitTimelineProps) {
  if (encounters.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">최근 진료</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {encounters.slice(0, 5).map((enc, i) => {
          const e = enc as Record<string, unknown>
          const codes = (e.kcd_codes as { code: string }[] | undefined) ?? []
          return (
            <div key={i} className="flex items-start gap-2 border-b border-gray-100 pb-2 last:border-0">
              <div className="text-xs text-gray-500 whitespace-nowrap pt-0.5">
                {(e.date as string)?.slice(0, 10)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {e.visit_type as string}
                  </Badge>
                  {codes.map((c) => (
                    <Badge key={c.code} variant="secondary" className="text-[10px] px-1 py-0">
                      {c.code}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-gray-600 line-clamp-1">
                  {e.assessment as string}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
