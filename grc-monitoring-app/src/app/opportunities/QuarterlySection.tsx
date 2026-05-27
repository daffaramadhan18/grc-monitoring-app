'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Opp {
  status: string
  harga: number | null
  expectedDate: string | null
  proposalName: string | null
  clientInitial: string | null
  clientName: string | null
}

interface Props {
  opps: Opp[]
  year?: number   // if provided, filter quarters to this year; defaults to current year
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Only include active (non-dead) proposals in the quarterly estimation
const ACTIVE = new Set(['Waiting for Result', 'In progress', 'Submitted'])

const QUARTERS = [
  { label: 'Q1', months: [1,2,3],    range: 'Jan – Mar' },
  { label: 'Q2', months: [4,5,6],    range: 'Apr – Jun' },
  { label: 'Q3', months: [7,8,9],    range: 'Jul – Sep' },
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuarterlySection({ opps, year }: Props) {
  const targetYear = year ?? new Date().getFullYear()
  const [hovered, setHovered] = useState<{ qLabel: string; clientInitial: string } | null>(null)

  // Only active opportunities with an expectedDate in the target year
  const eligible = opps.filter((o) => {
    if (!o.expectedDate) return false
    if (!ACTIVE.has(o.status)) return false
    return new Date(o.expectedDate).getFullYear() === targetYear
  })

  const quarters = QUARTERS.map((q) => {
    const inQ = eligible.filter((o) => {
      const m = new Date(o.expectedDate!).getMonth() + 1
      return q.months.includes(m)
    })
    const total = inQ.reduce((s, o) => s + (o.harga ?? 0), 0)

    // Build map: clientInitial → list of proposal names
    const clientMap = new Map<string, { name: string; proposals: string[] }>()
    for (const o of inQ) {
      const ini = o.clientInitial ?? '?'
      if (!clientMap.has(ini)) {
        clientMap.set(ini, { name: o.clientName ?? ini, proposals: [] })
      }
      if (o.proposalName) {
        clientMap.get(ini)!.proposals.push(o.proposalName)
      }
    }

    return { ...q, total, activeCount: inQ.length, clientMap }
  })

  const maxTotal = Math.max(...quarters.map((q) => q.total), 1)

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">Quarterly Potential Revenue &amp; Team Projection</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {targetYear} · Waiting for Result, In progress, Submitted · grouped by Expected Date
        </p>
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="rsm-mchart-scroll md:hidden">
        {quarters.map((q) => {
          const pct = q.total > 0 ? Math.round((q.total / maxTotal) * 100) : 0
          return (
            <div key={q.label} className="rsm-mchart-q">
              <div className="rsm-mchart-q-label">{q.label} · {q.range}</div>
              <div className="rsm-mchart-q-value">{q.total > 0 ? formatIDRShort(q.total) : '—'}</div>
              <div className="rsm-mchart-q-count">{q.activeCount} proposal{q.activeCount !== 1 ? 's' : ''}</div>
              <div className="rsm-mchart-q-bar">
                <div style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-4 gap-3">
        {quarters.map((q) => {
          const pct = q.total > 0 ? Math.round((q.total / maxTotal) * 100) : 0
          return (
            <div key={q.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-gray-800">{q.label}</span>
                <span className="text-xs text-gray-400">{q.range}</span>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-0.5">
                  {q.activeCount} proposal{q.activeCount !== 1 ? 's' : ''}
                </div>
                <div className="text-lg font-semibold text-gray-900 leading-tight">
                  {q.total > 0 ? formatIDRShort(q.total) : <span className="text-gray-300">—</span>}
                </div>
              </div>

              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#009CDE] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Clients Involved
                </div>
                {q.clientMap.size > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {Array.from(q.clientMap.entries()).map(([ini, { name, proposals }]) => (
                      <div
                        key={ini}
                        className="relative"
                        onMouseEnter={() => setHovered({ qLabel: q.label, clientInitial: ini })}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 cursor-default select-none">
                          {ini}
                        </span>

                        <AnimatePresence>
                          {hovered?.qLabel === q.label && hovered?.clientInitial === ini && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 4 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="absolute bottom-full left-0 mb-2 z-50 bg-white shadow-xl rounded-xl p-3 border border-gray-100"
                              style={{ minWidth: '220px' }}
                            >
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                {name}
                              </p>
                              <div className="space-y-1">
                                {proposals.map((pName, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#009CDE] mt-1 shrink-0" />
                                    <p className="text-xs text-gray-700 leading-snug">{pName}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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
