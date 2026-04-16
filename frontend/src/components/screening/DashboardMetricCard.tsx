import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  label: string
  value: number
  icon: LucideIcon
  color?: "default" | "red" | "yellow" | "green"
}

const colorMap = {
  default: "text-gray-600 bg-gray-50",
  red: "text-red-600 bg-red-50",
  yellow: "text-yellow-600 bg-yellow-50",
  green: "text-green-600 bg-green-50",
}

export function DashboardMetricCard({ label, value, icon: Icon, color = "default" }: Props) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-full p-2 ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
