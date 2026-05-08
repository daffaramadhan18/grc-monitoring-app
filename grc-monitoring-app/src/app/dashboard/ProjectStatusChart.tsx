import type { DashboardStats } from "@/types"

const STATUSES = [
  { key: "Planning",  color: "bg-[#009CDE]",     text: "text-[#006fa0]",   bg: "bg-[#009CDE]/15" },
  { key: "Fieldwork", color: "bg-amber-400",      text: "text-amber-700",   bg: "bg-amber-100" },
  { key: "Reporting", color: "bg-orange-400",     text: "text-orange-700",  bg: "bg-orange-100" },
  { key: "Finish",    color: "bg-[#43B02A]",      text: "text-[#2d7a1a]",   bg: "bg-[#43B02A]/15" },
]

export default function ProjectStatusChart({ stats }: { stats: DashboardStats }) {
  const total = Object.values(stats.project_by_status).reduce((s, v) => s + v, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-medium text-gray-600">Project Status Breakdown</h2>

      <div className="grid grid-cols-2 gap-3">
        {STATUSES.map(({ key, text, bg }) => {
          const count = stats.project_by_status[key] ?? 0
          return (
            <div key={key} className={`${bg} rounded-lg px-4 py-3`}>
              <p className={`text-2xl font-bold ${text}`}>{count}</p>
              <p className={`text-xs font-medium ${text} opacity-80 mt-0.5`}>{key}</p>
            </div>
          )
        })}
      </div>

      {total > 0 && (
        <div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
            {STATUSES.map(({ key, color }) => {
              const pct = Math.round(((stats.project_by_status[key] ?? 0) / total) * 100)
              if (pct === 0) return null
              return <div key={key} className={`${color} transition-all`} style={{ width: `${pct}%` }} title={`${key}: ${stats.project_by_status[key]}`} />
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {STATUSES.map(({ key, color }) => {
              const count = stats.project_by_status[key] ?? 0
              if (count === 0) return null
              return (
                <span key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {key}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
