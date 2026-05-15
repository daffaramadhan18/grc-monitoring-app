'use client'

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { FileText, Briefcase, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'

interface Props {
  totalOpps:      number
  hargaTotal:     number
  winRate:        number   // float, e.g. 66.7
  ongoingProjects: number
  confirmedFee:   number
}

function formatCurrencyShort(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(0)}M`
  return `Rp ${v.toLocaleString('id-ID')}`
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

export default function SummaryCards({ totalOpps, hargaTotal, winRate, ongoingProjects, confirmedFee }: Props) {
  const reduced = useReducedMotion() ?? false

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

  const cardCls = 'bg-white rounded-xl border border-gray-100 shadow-sm p-5 cursor-default'

  return (
    <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={container} initial="hidden" animate="show">

      {/* Card 1: Total Opportunities */}
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

      {/* Card 2: Win Rate */}
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

      {/* Card 3: Ongoing Projects */}
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

      {/* Card 4: Confirmed Fee */}
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

    </motion.div>
  )
}
