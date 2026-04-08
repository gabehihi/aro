import { Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSoapStore } from "@/hooks/useSoapStore"

const TAGS = [
  { key: "smoking_cessation", label: "금연" },
  { key: "alcohol_reduction", label: "절주" },
  { key: "exercise", label: "운동" },
  { key: "diet", label: "식이" },
] as const

export function HealthPromotionTags() {
  const { soapResult } = useSoapStore()

  if (!soapResult) return null

  const hp = soapResult.health_promotion
  const activeTags = TAGS.filter(
    (t) => hp[t.key] === true,
  )

  if (activeTags.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Heart className="h-4 w-4" />
          건강증진
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {activeTags.map((tag) => (
            <Badge key={tag.key} className="bg-green-100 text-green-800 text-xs">
              {tag.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
