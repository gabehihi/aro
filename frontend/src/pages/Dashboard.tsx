import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"

export function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          대시보드
        </h1>
        <p className="text-sm text-muted-foreground">
          {user?.name}님, 환영합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="오늘 예약" value="—" />
        <MetricCard title="F/U 필요" value="—" />
        <MetricCard title="미내원 (지난주)" value="—" />
        <MetricCard title="검진 미수검" value="—" />
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">
            Phase 1에서 환자 데이터가 등록되면 대시보드가 활성화됩니다.
          </p>
          <div className="mt-4 flex gap-2">
            <Badge variant="outline" className="text-medical-urgent border-medical-urgent/30">urgent</Badge>
            <Badge variant="outline" className="text-medical-warning border-medical-warning/30">due</Badge>
            <Badge variant="outline" className="text-medical-safe border-medical-safe/30">upcoming</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
