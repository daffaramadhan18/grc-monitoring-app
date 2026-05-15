'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { PROJ_STATUS_COLORS, formatDate } from '@/lib/utils'

interface OngoingProject {
  id: number
  proposalName: string
  status: string
  endDate: string | null
  clientName: string | null
  clientInitial: string | null
  termins: { status: string | null }[]
}

interface Props { projects: OngoingProject[] }

export default function OngoingProjects({ projects }: Props) {
  const reduced = useReducedMotion() ?? false
  const router = useRouter()

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.04 } },
  }
  const row: Variants = {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 },
    show:   { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.3, ease: 'easeOut' } },
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Ongoing Projects</h2>
          <p className="text-xs text-gray-400 mt-0.5">Fieldwork &amp; Reporting</p>
        </div>
        <span className="text-xs text-gray-400">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
      </div>

      {projects.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">No ongoing projects</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Project Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">End Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Termins</th>
              </tr>
            </thead>
            <motion.tbody
              variants={container}
              initial="hidden"
              animate="show"
              className="divide-y divide-gray-50"
            >
              {projects.map((p) => {
                const paid  = p.termins.filter((t) => t.status === 'Paid').length
                const total = p.termins.length
                const today = new Date().toISOString().slice(0, 10)
                const overdue = p.endDate && p.endDate < today
                return (
                  <motion.tr
                    key={p.id}
                    variants={row}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono font-semibold text-gray-600 bg-slate-100 px-1.5 py-0.5 rounded" title={p.clientName ?? ''}>
                        {p.clientInitial ?? p.clientName ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[220px] truncate">{p.proposalName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROJ_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {formatDate(p.endDate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {total > 0 ? `${paid}/${total} paid` : '—'}
                    </td>
                  </motion.tr>
                )
              })}
            </motion.tbody>
          </table>
        </div>
      )}
    </div>
  )
}
