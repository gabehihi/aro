import { Card, CardContent } from "@/components/ui/card"

interface PlaceholderProps {
  title: string
  description?: string
}

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">
            {description ?? `${title} 모듈은 이후 Phase에서 구현됩니다.`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
