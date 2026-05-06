"use client"

interface WorkloadRow {
  initial: string
  fullName: string
  active_projects: number
  alokasi_hours: number
  current_hours: number
}

export default function WorkloadTable({ workload }: { workload: WorkloadRow[] }) {
  if (workload.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Belum ada project aktif</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 text-gray-500 font-medium">Member</th>
            <th className="text-center py-2 text-gray-500 font-medium">Projects</th>
            <th className="text-right py-2 text-gray-500 font-medium">Hours (Used/Alloc)</th>
          </tr>
        </thead>
        <tbody>
          {workload.map((w) => {
            const pct = w.alokasi_hours > 0 ? Math.round((w.current_hours / w.alokasi_hours) * 100) : 0
            return (
              <tr key={w.initial} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">
                  <span className="text-xs text-gray-400 mr-1">{w.initial}</span>
                  {w.fullName}
                </td>
                <td className="py-2 text-center text-gray-600">{w.active_projects}</td>
                <td className="py-2 text-right text-gray-600">
                  {w.current_hours}h / {w.alokasi_hours}h
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
