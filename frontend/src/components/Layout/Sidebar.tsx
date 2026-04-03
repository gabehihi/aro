import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  FileText,
  Pill,
  Activity,
  FileOutput,
  Users,
  Settings,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import type { UserRole } from "@/types"

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  roles?: UserRole[]
}

const navItems: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "대시보드" },
  { to: "/soap", icon: FileText, label: "SOAP 작성", roles: ["doctor"] },
  { to: "/drugs", icon: Pill, label: "약물 검토", roles: ["doctor"] },
  { to: "/screening", icon: Activity, label: "검진 추적" },
  {
    to: "/documents",
    icon: FileOutput,
    label: "문서 발급",
    roles: ["doctor", "nurse"],
  },
  { to: "/patients", icon: Users, label: "환자 관리" },
  { to: "/settings", icon: Settings, label: "설정", roles: ["admin"] },
]

export function Sidebar() {
  const { user } = useAuth()

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  )

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar-background">
      <div className="flex h-14 items-center px-5">
        <img
          src="/aro_logo.png"
          alt="aro"
          className="h-7"
        />
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-xs text-muted-foreground">aro v0.1.0</p>
      </div>
    </aside>
  )
}
