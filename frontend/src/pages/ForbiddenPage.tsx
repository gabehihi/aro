import { useLocation, useNavigate } from "react-router-dom"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import type { UserRole } from "@/types"

const roleLabels: Record<UserRole, string> = {
  doctor: "의사",
  nurse: "간호사",
  admin: "관리자",
}

export function ForbiddenPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const requiredRoles = (location.state as { requiredRoles?: UserRole[] } | null)?.requiredRoles ?? []

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card className="border-destructive/20">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>접근 권한이 없습니다</CardTitle>
              <p className="text-sm text-muted-foreground">
                현재 계정으로는 이 화면을 열 수 없습니다.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">
              현재 권한: {user ? roleLabels[user.role] : "확인 불가"}
            </Badge>
            {requiredRoles.length > 0 && (
              <Badge variant="secondary">
                필요 권한: {requiredRoles.map((role) => roleLabels[role]).join(", ")}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            메뉴에 보이지 않는 화면이라도 주소로 직접 접근하면 이 안내가 표시됩니다.
          </p>

          <div className="flex gap-2">
            <Button onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
              대시보드로 이동
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
