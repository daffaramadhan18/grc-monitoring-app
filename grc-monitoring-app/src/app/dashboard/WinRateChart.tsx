"use client"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { DashboardStats } from "@/types"

const STATUS_COLORS: Record<string, string> = {
  Win:                  "#43B02A",
  Lose:                 "#EF4444",
  "In progress":        "#009CDE",
  "Waiting for Result": "#F59E0B",
  Backlog:              "#9CA3AF",
  Withdraw:             "#6B7280",
  Cancelled:            "#94A3B8",
  "Transfer to others": "#8B5CF6",
}

export default function WinRateChart({ stats }: { stats: DashboardStats }) {
  const data = Object.entries(stats.opp_by_status)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
  }

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <div className="shrink-0" style={{ width: 220, height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
              {data.map((d) => (
                <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? "#CBD5E1"} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [v, ""]} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_COLORS[d.name] ?? "#CBD5E1" }}
            />
            <span className="text-gray-600">{d.name}</span>
            <span className="font-semibold text-gray-900">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
