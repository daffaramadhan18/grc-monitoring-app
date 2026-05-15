'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Crown } from 'lucide-react'
import { OPP_STATUS_COLORS, formatDate, formatRupiah } from '@/lib/utils'

interface PipelineOpp {
  id: number
  proposalName: string
  status: string
  phase: string | null
  expectedDate: string | null
  harga: number | null
  clientName: string | null
  clientInitial: string | null
  micInitial: string | null
  tm1Initial: string | null
  tm2Initial: string | null
  tm3Initial: string | null
  tm4Initial: string | null
  tm5Initial: string | null
  tm6Initial: string | null
}

interface Props { opps: PipelineOpp[] }

const AVATAR_COLORS = ['#009CDE', '#43B02A', '#58595B', '#F59E0B', '#8B5CF6', '#EC4899']

function avatarColor(initial: string) {
  const hash = initial.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function AvatarBubble({ initial, isMic }: { initial: string; isMic: boolean }) {
  return (
    <span
      className="relative inline-flex items-center justify-center w-6 h-6 rounded-full text-white font-semibold text-[9px] shrink-0"
      style={{ backgroundColor: isMic ? '#2D2D2D' : avatarColor(initial) }}
      title={isMic ? `MIC: ${initial}` : initial}
    >
      {initial.slice(0, 2)}
      {isMic && (
        <span className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-px flex items-center justify-center">
          <Crown size={6} className="text-white" />
        </span>
      )}
    </span>
  )
}

const GROUPS = ['In progress', 'Waiting for Result', 'Submitted'] as const

const GROUP_LABELS: Record<string, string> = {
  'In progress':        'In Progress',
  'Waiting for Result': 'Waiting for Result',
  'Submitted':          'Submitted',
}

export default function ProposalPipeline({ opps }: Props) {
  const reduced = useReducedMotion() ?? false
  const router  = useRouter()

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.06 } },
  }
  const row: Variants = {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 10 },
    show:   { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.3, ease: 'easeOut' } },
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Active Proposal Pipeline</h2>
        <p className="text-xs text-gray-400 mt-0.5">{opps.length} proposal{opps.length !== 1 ? 's' : ''} active</p>
      </div>

      {opps.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada proposal aktif</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {GROUPS.map((status) => {
            const group = opps.filter((o) => o.status === status)
            if (group.length === 0) return null
            return (
              <div key={status}>
                <div className="px-5 py-2.5 bg-gray-50/70 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${OPP_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {GROUP_LABELS[status]}
                  </span>
                  <span className="text-xs text-gray-400">{group.length}</span>
                </div>
                <motion.div variants={container} initial="hidden" animate="show" className="divide-y divide-gray-50">
                  {group.map((opp) => {
                    const tms = [opp.tm1Initial, opp.tm2Initial, opp.tm3Initial,
                                 opp.tm4Initial, opp.tm5Initial, opp.tm6Initial].filter(Boolean) as string[]
                    const isOverdue = opp.expectedDate && opp.expectedDate < today
                    return (
                      <motion.div
                        key={opp.id}
                        variants={row}
                        className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push('/opportunities')}
                      >
                        {/* Name + client */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{opp.proposalName}</p>
                          {opp.clientName && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{opp.clientName}</p>
                          )}
                        </div>

                        {/* Harga */}
                        <span className="text-xs text-gray-600 whitespace-nowrap shrink-0 tabular-nums">
                          {opp.harga ? formatRupiah(opp.harga) : '—'}
                        </span>

                        {/* Expected date */}
                        <span className={`text-xs whitespace-nowrap shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          {formatDate(opp.expectedDate)}
                        </span>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
