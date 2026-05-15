'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { capacityBadge } from '@/lib/utils'

interface WorkloadRow {
  id: number
  initial: string
  fullName: string
  level: string
  active_projects: number
  active_proposals: number
}

interface Props { workload: WorkloadRow[] }

const AVATAR_COLORS = ['#009CDE', '#43B02A', '#58595B', '#F59E0B', '#8B5CF6', '#EC4899']

function avatarColor(initial: string) {
  const hash = initial.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}


export default function TeamWorkload({ workload }: Props) {
  const reduced = useReducedMotion() ?? false
  const router = useRouter()

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.08 } },
  }
  const item: Variants = {
    hidden: { opacity: reduced ? 1 : 0, x: reduced ? 0 : 30 },
    show:   { opacity: 1, x: 0, transition: { duration: reduced ? 0 : 0.35, ease: 'easeOut' } },
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Team Workload</h2>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-gray-400">{workload.length} member{workload.length !== 1 ? 's' : ''} active</p>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#009CDE] inline-block" /> proposals
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#43B02A] inline-block" /> projects
          </span>
        </div>
      </div>

      {workload.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">Belum ada beban kerja aktif</p>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="divide-y divide-gray-50">
          {[...workload]
            .sort((a, b) => {
              const ba = capacityBadge(a.active_projects, a.active_proposals)
              const bb = capacityBadge(b.active_projects, b.active_proposals)
              if (ba.order !== bb.order) return ba.order - bb.order
              return (b.active_projects + b.active_proposals) - (a.active_projects + a.active_proposals)
            })
            .map((row) => {
            const badge = capacityBadge(row.active_projects, row.active_proposals)
            return (
              <motion.div
                key={row.id}
                variants={item}
                onClick={() => router.push(`/team/${row.id}`)}
                className="px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50/70 transition-colors group"
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
                  style={{ backgroundColor: avatarColor(row.initial) }}
                >
                  {row.initial.slice(0, 2)}
                </div>

                {/* Name + level */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#009CDE] transition-colors">
                    {row.fullName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#009CDE] inline-block" />
                      {row.active_proposals}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#43B02A] inline-block" />
                      {row.active_projects}
                    </span>
                  </div>
                </div>

                {/* Capacity badge */}
                {badge.overloaded && !reduced ? (
                  <span className={`rsm-badge-heartbeat px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      )}

    </div>
  )
}
