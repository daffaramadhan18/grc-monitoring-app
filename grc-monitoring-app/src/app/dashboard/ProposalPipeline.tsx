'use client'

import { useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { OPP_STATUS_COLORS, formatDate, formatRupiah } from '@/lib/utils'
import EditOpportunityModal, { type OppFull } from '@/components/EditOpportunityModal'

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

interface ServiceType { id: number; name: string }
interface TeamMember  { id: number; initial: string; fullName: string; level: string }

interface Props {
  opps: PipelineOpp[]
  serviceTypes: ServiceType[]
  teamMembers: TeamMember[]
}

const GROUPS = ['In progress', 'Waiting for Result', 'Submitted'] as const

const GROUP_LABELS: Record<string, string> = {
  'In progress':        'In Progress',
  'Waiting for Result': 'Waiting for Result',
  'Submitted':          'Submitted',
}

export default function ProposalPipeline({ opps, serviceTypes, teamMembers }: Props) {
  const reduced = useReducedMotion() ?? false

  const [localOpps, setLocalOpps] = useState<PipelineOpp[]>(opps)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOpp, setEditingOpp] = useState<OppFull | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.06 } },
  }
  const row: Variants = {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 10 },
    show:   { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.3, ease: 'easeOut' } },
  }

  const today = new Date().toISOString().slice(0, 10)

  async function handleRowClick(id: number) {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/opportunities/${id}`)
      if (!res.ok) throw new Error('Failed to load')
      const data: OppFull = await res.json()
      setEditingOpp(data)
      setModalOpen(true)
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setLoadingId(null)
    }
  }

  function handleSaved(saved: OppFull) {
    // Update local pipeline row if it still matches active statuses
    const activeStatuses = ['In progress', 'Waiting for Result', 'Submitted']
    if (activeStatuses.includes(saved.status)) {
      setLocalOpps((prev) => prev.map((o) =>
        o.id === saved.id
          ? { ...o, proposalName: saved.proposalName, status: saved.status,
              phase: saved.phase, expectedDate: saved.expectedDate, harga: saved.harga,
              clientName: saved.clientName, clientInitial: saved.clientInitial,
              micInitial: saved.micInitial, tm1Initial: saved.tm1Initial,
              tm2Initial: saved.tm2Initial, tm3Initial: saved.tm3Initial,
              tm4Initial: saved.tm4Initial, tm5Initial: saved.tm5Initial,
              tm6Initial: saved.tm6Initial }
          : o
      ))
    } else {
      // Opp moved out of active statuses — remove from pipeline
      setLocalOpps((prev) => prev.filter((o) => o.id !== saved.id))
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Active Proposal Pipeline</h2>
        <p className="text-xs text-gray-400 mt-0.5">{localOpps.length} proposal{localOpps.length !== 1 ? 's' : ''} active</p>
      </div>

      {localOpps.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada proposal aktif</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {GROUPS.map((status) => {
            const group = localOpps.filter((o) => o.status === status)
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
                    const isOverdue = opp.expectedDate && opp.expectedDate < today
                    const isLoading = loadingId === opp.id
                    return (
                      <motion.div
                        key={opp.id}
                        variants={row}
                        className={`px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${isLoading ? 'opacity-60' : ''}`}
                        onClick={() => !isLoading && handleRowClick(opp.id)}
                      >
                        {/* Name + client */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{opp.proposalName}</p>
                          {opp.clientName && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{opp.clientName}</p>
                          )}
                        </div>

                        {/* Harga */}
                        {opp.harga ? (
                          <span className="text-xs text-gray-600 whitespace-nowrap shrink-0 tabular-nums">
                            {formatRupiah(opp.harga)}
                          </span>
                        ) : null}

                        {/* Expected date */}
                        {opp.expectedDate && (
                          <span className={`text-xs whitespace-nowrap shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            {formatDate(opp.expectedDate)}
                          </span>
                        )}
                      </motion.div>
                    )
                  })}
                </motion.div>
              </div>
            )
          })}
        </div>
      )}

      <EditOpportunityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        opp={editingOpp}
        serviceTypes={serviceTypes}
        teamMembers={teamMembers}
        onSaved={handleSaved}
      />
    </div>
  )
}
