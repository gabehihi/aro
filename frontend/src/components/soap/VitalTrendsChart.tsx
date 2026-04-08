import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface VitalTrendsChartProps {
  vitals: Record<string, unknown>[]
}

export function VitalTrendsChart({ vitals }: VitalTrendsChartProps) {
  if (vitals.length === 0) return null

  const data = [...vitals].reverse().map((v) => ({
    date: ((v as Record<string, string>).date ?? "").slice(5, 10),
    SBP: (v as Record<string, number | null>).sbp,
    DBP: (v as Record<string, number | null>).dbp,
    HR: (v as Record<string, number | null>).hr,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Vital Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="SBP" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="DBP" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="HR" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="5 5" dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
