import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SectionShell({
  title,
  badge,
  children,
}: {
  title: string
  badge?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {badge ? (
          <span className="text-[11px] font-medium text-gray-500">{badge}</span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">{children}</CardContent>
    </Card>
  )
}

export function ToggleLabel({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-2 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}
