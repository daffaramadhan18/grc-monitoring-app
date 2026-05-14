'use client'

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { FileText, Briefcase, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'

interface Props {
  activeProposals: number
  ongoingProjects: number
  winRate: number
  confirmedFee: number
}

const AVATAR_COLORS = ['#009CDE', '#43B02A', '#58595B', '#F59E0B', '#8B5CF6', '#EC4899']

interface CardDef {
  key: string
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  suffix?: string
  currency?: boolean
}

const CARDS: CardDef[] = [
  { key: 'activeProposals', label: 'Active Proposals', icon: FileText,   color: '#009CDE', bgColor: '#EBF8FF' },
  { key: 'ongoingProjects', label: 'Ongoing Projects',  icon: Briefcase,  color: '#43B02A', bgColor: '#F0FDF4' },
  { key: 'winRate',         label: 'Win Rate YTD',       icon: TrendingUp, color: '#F59E0B', bgColor: '#FFFBEB', suffix: '%' },
  { key: 'confirmedFee',   label: 'Confirmed Fee',      icon: Wallet,     color: '#8B5CF6', bgColor: '#F5F3FF', currency: true },
]

function formatValue(value: number, currency?: boolean, suffix?: string): string {
  if (currency) {
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}B`
    if (value >= 1_000_000)     return `Rp ${(value / 1_000_000).toFixed(0)}M`
    return `Rp ${value.toLocaleString('id-ID')}`
  }
  return `${value}${suffix ?? ''}`
}

function AnimatedCounter({ target, currency, suffix, reduced }: {
  target: number; currency?: boolean; suffix?: string; reduced: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (reduced || !ref.current) {
      if (ref.current) ref.current.textContent = formatValue(target, currency, suffix)
      return
    }
    const duration = 700
    const start = performance.now()
    let frame: number

    function tick(now: number) {
      const elapsed = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - elapsed, 3) // easeOutCubic
      const current = Math.round(eased * target)
      if (ref.current) ref.current.textContent = formatValue(current, currency, suffix)
      if (elapsed < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, currency, suffix, reduced])

  return <span ref={ref}>{formatValue(reduced ? target : 0, currency, suffix)}</span>
}

export default function SummaryCards({ activeProposals, ongoingProjects, winRate, confirmedFee }: Props) {
  const reduced = useReducedMotion() ?? false

  const values: Record<string, number> = { activeProposals, ongoingProjects, winRate, confirmedFee }

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.1 } },
  }
  const item: Variants = {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 20 },
    show:   { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.35, ease: 'easeOut' } },
  }

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {CARDS.map(({ key, label, icon: Icon, color, bgColor, suffix, currency }) => (
        <motion.div
          key={key}
          variants={item}
          whileHover={reduced ? {} : { y: -4, scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 cursor-default"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">
                <AnimatedCounter
                  target={values[key]}
                  currency={currency}
                  suffix={suffix}
                  reduced={reduced}
                />
              </p>
            </div>
            <div className="p-2.5 rounded-lg shrink-0 ml-3" style={{ backgroundColor: bgColor }}>
              <Icon size={20} style={{ color }} />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
