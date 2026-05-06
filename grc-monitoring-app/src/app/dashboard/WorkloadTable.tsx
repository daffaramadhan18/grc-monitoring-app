"use client"
import type { TeamWorkload } from "@/types"

export default function WorkloadTable({ workload }: { workload: TeamWorkload[] }) {
  if (workload.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No team members assigned to projects yet</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 text-gray-500 font-medium">Member</th>
            <th className="text-center py-2 text-gray-500 font-medium">Projects</th>
            <th className="text-right py-2 text-gray-500 font-medium">Hours Used/Alloc</th>
          </tr>
        </thead>
        <tbody>
          {workload.map((w) => {
            const pct = w.hours_allocated > 0 ? Math.round((w.hours_current / w.hours_allocated) * 100) : 0
            return (
              <tr key={w.team_member_id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">{w.name}</td>
                <td className="py-2 text-center text-gray-600">{w.active_projects}</td>
                <td className="py-2 text-right text-gray-600">
                  {w.hours_current}h / {w.hours_allocated}h
                  <span className={`ml-2 text-xs font-medium ${pct > 90 ? "text-red-500" : "text-gray-400"}`}>
                    ({pct}%)
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
