'use client'

interface Opp {
  status: string
  harga: number | null
  expectedDate: string | null
  micInitial: string | null
  tm1Initial: string | null; tm2Initial: string | null; tm3Initial: string | null
  tm4Initial: string | null; tm5Initial: string | null; tm6Initial: string | null
}

interface Props { opps: Opp[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEAD = new Set(['Win','Lose','Withdrawal','Cancelled','Transfer to others'])

const QUARTERS = [
  { label: 'Q1', months: [1,2,3],   range: 'Jan – Mar' },
  { label: 'Q2', months: [4,5,6],   range: 'Apr – Jun' },
  { label: 'Q3', months: [7,8,9],   range: 'Jul – Sep' },
  { label: 'Q4', months: [10,11,12], range: 'Oct – Dec' },
]

function formatIDRShort(value: number): string {
  if (value === 0) return 'IDR 0'
  if (value >= 1_000_000_000) {
    const n = value / 1_000_000_000
    return `IDR ${parseFloat(n.toFixed(2))}B`
  }
  const n = value / 1_000_000
  return `IDR ${parseFloat(n.toFixed(1))}M`
}

function teamInitials(opp: Opp): string[] {
  return [
    opp.micInitial,
    opp.tm1Initial, opp.tm2Initial, opp.tm3Initial,
    opp.tm4Initial, opp.tm5Initial, opp.tm6Initial,
  ].filter(Boolean) as string[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuarterlySection({ opps }: Props) {
  // Only active proposals with an expected date
  const active = opps.filter((o) => !DEAD.has(o.status) && o.expectedDate)

  // Aggregate per quarter
  const quarters = QUARTERS.map((q) => {
    const inQ = active.filter((o) => {
      const m = new Date(o.expectedDate!).getMonth() + 1
      return q.months.includes(m)
    })
    const total = inQ.reduce((s, o) => s + (o.harga ?? 0), 0)
    const uniqueTeam = [...new Set(inQ.flatMap(teamInitials))]
    return { ...q, count: inQ.length, total, team: uniqueTeam }
  })

  const maxTotal = Math.max(...quarters.map((q) => q.total), 1)

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">Quarterly Potential Revenue &amp; Team Projection</h2>
        <p className="text-xs text-gray-400 mt-0.5">Active proposals only · grouped by Expected Date</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {quarters.map((q) => {
          const pct = q.total > 0 ? Math.round((q.total / maxTotal) * 100) : 0
          return (
            <div key={q.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              {/* Quarter header */}
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-gray-800">{q.label}</span>
                <span className="text-xs text-gray-400">{q.range}</span>
              </div>

              {/* Count + value */}
              <div>
                <div className="text-xs text-gray-400 mb-0.5">
                  {q.count} proposal{q.count !== 1 ? 's' : ''}
                </div>
                <div className="text-lg font-semibold text-gray-900 leading-tight">
                  {q.total > 0 ? formatIDRShort(q.total) : <span className="text-gray-300">—</span>}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#009CDE] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Team badges */}
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Proposed Team Involved
                </div>
                {q.team.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {q.team.map((ini) => (
                      <span
                        key={ini}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700"
                      >
                        {ini}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
