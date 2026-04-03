import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"

const roleLabels: Record<string, string> = {
  doctor: "의사",
  nurse: "간호사",
  admin: "관리자",
}

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div />

      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm text-foreground">{user.name}</span>
            <Badge variant="secondary" className="text-xs">
              {roleLabels[user.role] ?? user.role}
            </Badge>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-muted-foreground"
        >
          <LogOut className="mr-1 h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </header>
  )
}
