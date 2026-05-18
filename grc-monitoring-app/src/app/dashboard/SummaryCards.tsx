'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import { FileText, Briefcase, TrendingUp, Wallet } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface OppPreview {
  id: number; proposalName: string; clientName: string | null; status: string; harga: number | null
}
interface ProjectPreview {
  id: number; proposalName: string; clientName: string | null
  status: string; endDate: string | null; confirmedFee: number | null
}

interface Props {
  totalOpps:      number
  hargaTotal:     number
  winRate:        number
  ongoingProjects: number
  confirmedFee:   number
  oppsList: OppPreview[]
  wonOppsList?: OppPreview[]
  projectsList: ProjectPreview[]
}

function formatCurrencyShort(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(0)}M`
  return `Rp ${v.toLocaleString('id-ID')}`
}

function formatRupiahFull(v: number): string {
  return `Rp ${v.toLocaleString('id-ID')}`
}

function statusBarColor(status: string): string {
  switch (status) {
    case 'Win': return '#43B02A'
    case 'Lose': return '#EF4444'
    case 'Waiting for Result': return '#F59E0B'
    case 'Submitted': return '#3B82F6'
    case 'In progress': return '#009CDE'
    default: return '#9CA3AF'
  }
}

function AnimatedInt({ target, reduced }: { target: number; reduced: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    if (reduced) { ref.current.textContent = String(target); return }
    const start = performance.now()
    let frame: number
    function tick(now: number) {
      const t = Math.min((now - start) / 700, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      if (ref.current) ref.current.textContent = String(Math.round(eased * target))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced])
  return <span ref={ref}>{reduced ? target : 0}</span>
}

function AnimatedPercent({ target, reduced }: { target: number; reduced: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    if (reduced) { ref.current.textContent = `${target.toFixed(1)}%`; return }
    const start = performance.now()
    let frame: number
    function tick(now: number) {
      const t = Math.min((now - start) / 700, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      if (ref.current) ref.current.textContent = `${(eased * target).toFixed(1)}%`
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced])
  return <span ref={ref}>{reduced ? `${target.toFixed(1)}%` : '0.0%'}</span>
}

function AnimatedCurrency({ target, reduced }: { target: number; reduced: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    if (reduced) { ref.current.textContent = formatCurrencyShort(target); return }
    const start = performance.now()
    let frame: number
    function tick(now: number) {
      const t = Math.min((now - start) / 700, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      if (ref.current) ref.current.textContent = formatCurrencyShort(Math.round(eased * target))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced])
  return <span ref={ref}>{reduced ? formatCurrencyShort(target) : 'Rp 0'}</span>
}

export default function SummaryCards({
  totalOpps, hargaTotal, winRate, ongoingProjects, confirmedFee,
  oppsList, wonOppsList, projectsList,
}: Props) {
  const reduced = useReducedMotion() ?? false
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.1 } },
  }
  const item: Variants = {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 20 },
    show:   { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.35, ease: 'easeOut' } },
  }

  const cardHover = reduced ? {} : {
    whileHover: {
      y: -6, scale: 1.03,
      boxShadow: '0 12px 24px -8px rgb(0 0 0 / 0.12), 0 4px 8px -4px rgb(0 0 0 / 0.08)',
      transition: { type: 'spring' as const, stiffness: 280, damping: 22 },
    },
  }
  const iconHover = reduced ? {} : {
    whileHover: { rotate: -8, scale: 1.08, transition: { type: 'spring' as const, stiffness: 300, damping: 18 } },
  }

  const cardCls = 'bg-white rounded-xl border border-gray-100 shadow-sm p-5 cursor-default h-full'

  return (
    <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch" variants={container} initial="hidden" animate="show">

      {/* Card 1: Total Opportunities */}
      <div className="relative h-full" onMouseEnter={() => setHoveredCard(1)} onMouseLeave={() => setHoveredCard(null)}>
        <motion.div variants={item} {...cardHover} className={cardCls}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Opportunities</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">
                <AnimatedCurrency target={hargaTotal} reduced={reduced} />
              </p>
              <p className="mt-0.5 text-xs text-gray-400 tabular-nums">
                <AnimatedInt target={totalOpps} reduced={reduced} />{' opportunities'}
              </p>
            </div>
            <motion.div {...iconHover} className="p-2.5 rounded-lg shrink-0 ml-3" style={{ backgroundColor: '#EBF8FF' }}>
              <FileText size={20} style={{ color: '#009CDE' }} />
            </motion.div>
          </div>
        </motion.div>
        <AnimatePresence>
          {hoveredCard === 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 z-50 bg-white shadow-xl rounded-xl p-4 min-w-[280px] border border-gray-100"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Opportunities</p>
              <div className="max-h-[320px] overflow-y-auto">
                {[...oppsList].sort((a, b) => (b.harga ?? 0) - (a.harga ?? 0)).slice(0, 8).map(opp => (
                  <div key={opp.id} className="flex items-stretch gap-2 py-1.5">
                    <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: statusBarColor(opp.status) }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{opp.proposalName.slice(0, 28)}</p>
                      <p className="text-[10px] text-gray-400 truncate">{opp.clientName ?? '—'}</p>
                    </div>
                    <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">{opp.harga ? formatRupiahFull(opp.harga) : '—'}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card 2: Win Rate */}
      <div className="relative h-full" onMouseEnter={() => setHoveredCard(2)} onMouseLeave={() => setHoveredCard(null)}>
        <motion.div variants={item} {...cardHover} className={cardCls}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Win Rate</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">
                <AnimatedPercent target={winRate} reduced={reduced} />
              </p>
              <p className="mt-0.5 text-xs text-gray-400">Win / (Win + Lose)</p>
            </div>
            <motion.div {...iconHover} className="p-2.5 rounded-lg shrink-0 ml-3" style={{ backgroundColor: '#FFFBEB' }}>
              <TrendingUp size={20} style={{ color: '#F59E0B' }} />
            </motion.div>
          </div>
        </motion.div>
        <AnimatePresence>
          {hoveredCard === 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 z-50 bg-white shadow-xl rounded-xl p-4 min-w-[280px] border border-gray-100"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-1.5">✅ Won</p>
                  <div className="space-y-1 max-h-[160px] overflow-y-auto">
                    {oppsList.filter(o => o.status === 'Win').map(o => (
                      <p key={o.id} className="text-xs text-gray-700 truncate">{o.proposalName.slice(0, 24)}</p>
                    ))}
                    {oppsList.filter(o => o.status === 'Win').length === 0 && <p className="text-xs text-gray-400">—</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-1.5">❌ Lost</p>
                  <div className="space-y-1 max-h-[160px] overflow-y-auto">
                    {oppsList.filter(o => o.status === 'Lose').map(o => (
                      <p key={o.id} className="text-xs text-gray-700 truncate">{o.proposalName.slice(0, 24)}</p>
                    ))}
                    {oppsList.filter(o => o.status === 'Lose').length === 0 && <p className="text-xs text-gray-400">—</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card 3: Ongoing Projects */}
      <div className="relative h-full" onMouseEnter={() => setHoveredCard(3)} onMouseLeave={() => setHoveredCard(null)}>
        <motion.div variants={item} {...cardHover} className={cardCls}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ongoing Projects</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">
                <AnimatedInt target={ongoingProjects} reduced={reduced} />
              </p>
              <p className="mt-0.5 text-xs text-gray-400">Fieldwork &amp; Reporting</p>
            </div>
            <motion.div {...iconHover} className="p-2.5 rounded-lg shrink-0 ml-3" style={{ backgroundColor: '#F0FDF4' }}>
              <Briefcase size={20} style={{ color: '#43B02A' }} />
            </motion.div>
          </div>
        </motion.div>
        <AnimatePresence>
          {hoveredCard === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 z-50 bg-white shadow-xl rounded-xl p-4 min-w-[280px] border border-gray-100"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ongoing Projects</p>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {projectsList.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${p.status === 'Fieldwork' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {p.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{p.proposalName.slice(0, 26)}</p>
                      <p className="text-[10px] text-gray-400 truncate">{p.clientName ?? '—'}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 whitespace-nowrap">{p.endDate ? formatDate(p.endDate) : '—'}</p>
                  </div>
                ))}
                {projectsList.length === 0 && <p className="text-xs text-gray-400">No ongoing projects</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card 4: Confirmed Fee */}
      <div className="relative h-full" onMouseEnter={() => setHoveredCard(4)} onMouseLeave={() => setHoveredCard(null)}>
        <motion.div variants={item} {...cardHover} className={cardCls}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirmed Fee</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">
                <AnimatedCurrency target={confirmedFee} reduced={reduced} />
              </p>
            </div>
            <motion.div {...iconHover} className="p-2.5 rounded-lg shrink-0 ml-3" style={{ backgroundColor: '#F5F3FF' }}>
              <Wallet size={20} style={{ color: '#8B5CF6' }} />
            </motion.div>
          </div>
        </motion.div>
        <AnimatePresence>
          {hoveredCard === 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 z-50 bg-white shadow-xl rounded-xl p-4 min-w-[280px] border border-gray-100"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">By Project</p>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {[...projectsList].filter(p => (p.confirmedFee ?? 0) > 0).sort((a, b) => (b.confirmedFee ?? 0) - (a.confirmedFee ?? 0)).map(p => (
                  <div key={p.id} className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{p.proposalName.slice(0, 24)}</p>
                      <p className="text-[10px] text-gray-400 truncate">{p.clientName ?? '—'}</p>
                    </div>
                    <p className="text-xs font-semibold text-green-600 whitespace-nowrap">{formatRupiahFull(p.confirmedFee ?? 0)}</p>
                  </div>
                ))}
                {projectsList.filter(p => (p.confirmedFee ?? 0) > 0).length === 0 && <p className="text-xs text-gray-400">No confirmed fees</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  )
}
