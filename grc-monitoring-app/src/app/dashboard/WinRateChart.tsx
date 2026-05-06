"use client"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { DashboardStats } from "@/types"

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#6b7280"]

export default function WinRateChart({ stats }: { stats: DashboardStats }) {
  const data = [
    { name: "Win", value: stats.win_count },
    { name: "Lose", value: stats.lose_count },
    { name: "In Progress", value: stats.in_progress_count },
    {
      name: "Other",
      value: stats.total_opportunities - stats.win_count - stats.lose_count - stats.in_progress_count,
    },
  ].filter((d) => d.value > 0)

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [v, ""]} />
        <Legend iconType="circle" iconSize={10} />
      </PieChart>
    </ResponsiveContainer>
  )
}
