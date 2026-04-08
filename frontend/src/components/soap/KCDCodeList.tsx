import { Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSoapStore } from "@/hooks/useSoapStore"

export function KCDCodeList() {
  const { soapResult } = useSoapStore()

  if (!soapResult || soapResult.kcd_codes.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Tag className="h-4 w-4" />
          KCD 코드
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {soapResult.kcd_codes.map((kcd) => (
            <Badge key={kcd.code} variant="outline" className="text-xs">
              {kcd.code} {kcd.description}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
