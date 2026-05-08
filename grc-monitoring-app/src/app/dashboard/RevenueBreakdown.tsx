import type { DashboardStats } from "@/types"
import { formatRupiah } from "@/lib/utils"

const TERMIN_ROWS = [
  { key: "Paid",                       label: "Paid",                       color: "bg-[#43B02A]",  text: "text-[#2d7a1a]",  bg: "bg-[#43B02A]/15" },
  { key: "Invoice Sent",               label: "Invoice Sent",               color: "bg-[#009CDE]",  text: "text-[#006fa0]",  bg: "bg-[#009CDE]/15" },
  { key: "Invoice Requested",          label: "Invoice Requested",          color: "bg-amber-400",  text: "text-amber-700",  bg: "bg-amber-100" },
  { key: "Deliverables in Progress",   label: "Deliverables in Progress",   color: "bg-gray-300",   text: "text-gray-600",   bg: "bg-gray-100" },
]

export default function RevenueBreakdown({ stats }: { stats: DashboardStats }) {
  const total = stats.total_confirmed_fee
  const collected = stats.revenue_by_termin_status["Paid"] ?? 0
  const collectRate = total > 0 ? Math.round((collected / total) * 100) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between">
        <h2 className="text-sm font-medium text-gray-600">Revenue Summary</h2>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total Confirmed Fee</p>
          <p className="text-base font-bold text-gray-900">{formatRupiah(total)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {TERMIN_ROWS.map(({ key, label, bg, text }) => {
          const amount = stats.revenue_by_termin_status[key] ?? 0
          if (amount === 0 && key !== "Paid") return null
          return (
            <div key={key} className="flex items-center justify-between">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>{label}</span>
              <span className="text-sm font-semibold text-gray-800">{formatRupiah(amount)}</span>
            </div>
          )
        })}
      </div>

      {total > 0 && (
        <div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
            {TERMIN_ROWS.map(({ key, color }) => {
              const pct = Math.round(((stats.revenue_by_termin_status[key] ?? 0) / total) * 100)
              if (pct === 0) return null
              return <div key={key} className={`${color} transition-all`} style={{ width: `${pct}%` }} />
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {collectRate}% collected ({formatRupiah(collected)} of {formatRupiah(total)})
          </p>
        </div>
      )}
    </div>
  )
}
