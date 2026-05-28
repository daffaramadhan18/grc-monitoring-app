'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import SummaryCards from './SummaryCards'
import ProposalPipeline from './ProposalPipeline'
import TeamWorkload from './TeamWorkload'
import OngoingProjects from './OngoingProjects'
import DashboardFilters from './DashboardFilters'
import QuarterlySection from '../opportunities/QuarterlySection'

// ─── API response types ───────────────────────────────────────────────────────

const OPP_TM = [
  'micInitial', 'tm1Initial', 'tm2Initial', 'tm3Initial',
  'tm4Initial', 'tm5Initial', 'tm6Initial',
] as const
type OppTmField = typeof OPP_TM[number]

interface ApiOpp {
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
  serviceType: { id: number; name: string } | null
  subService:  { id: number; name: string } | null
}

interface ApiProject {
  id: number
  proposalName: string
  status: string
  startedDate: string | null
  endDate: string | null
  confirmedFee: number | null
  clientName: string | null
  clientInitial: string | null
  micInitial: string | null
  teamMembers: string[]
  termins: { id: number; terminNumber: number; status: string }[]
}

interface ApiMember {
  id: number
  initial: string
  fullName: string
  level: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMonthRange(month: string | null) {
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
  const [y, m] = month.split('-').map(Number)
  return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
}

function inRange(dateStr: string | null, range: { gte: Date; lt: Date } | null): boolean {
  if (!range) return true
  if (!dateStr) return false
  const d = new Date(dateStr)
  return d >= range.gte && d < range.lt
}

// ─── Inner component (needs Suspense for useSearchParams) ─────────────────────

function DashboardInner() {
  const searchParams = useSearchParams()
  const month        = searchParams.get('month')
  const range        = parseMonthRange(month)
  const quarterYear  = month ? Number(month.split('-')[0]) : new Date().getFullYear()

  const { data: allOpps     = [] } = useSWR<ApiOpp[]>('/api/opportunities', fetcher)
  const { data: allProjects = [] } = useSWR<ApiProject[]>('/api/projects', fetcher)
  const { data: members     = [] } = useSWR<ApiMember[]>('/api/team', fetcher)

  // ── Month-filtered sets ────────────────────────────────────────────────────
  const filteredOpps = range
    ? allOpps.filter(o => inRange(o.expectedDate, range))
    : allOpps

  const ongoingProjects = range
    ? allProjects.filter(p => ['Planning', 'Fieldwork', 'Reporting'].includes(p.status) && inRange(p.startedDate, range))
    : allProjects.filter(p => ['Planning', 'Fieldwork', 'Reporting'].includes(p.status))

  const finishedProjects = range
    ? allProjects.filter(p => p.status === 'Finish' && inRange(p.startedDate, range))
    : allProjects.filter(p => p.status === 'Finish')

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalOpps  = filteredOpps.length
  const hargaTotal = filteredOpps.reduce((s, o) => s + (o.harga ?? 0), 0)
  const wins       = filteredOpps.filter(o => o.status === 'Win').length
  const loses      = filteredOpps.filter(o => o.status === 'Lose').length
  const winRate    = (wins + loses) > 0 ? (wins / (wins + loses)) * 100 : 0

  // Confirmed fee = sum of ALL won opps, not month-scoped (matches original)
  const wonOpps      = allOpps.filter(o => o.status === 'Win')
  const confirmedFee = wonOpps.reduce((s, o) => s + (o.harga ?? 0), 0)

  // ── Sub-datasets ───────────────────────────────────────────────────────────
  const pipeline = filteredOpps.filter(o =>
    ['Waiting for Result', 'In progress', 'Submitted'].includes(o.status)
  )

  const quarterlyOpps = allOpps.filter(o =>
    ['Waiting for Result', 'In progress', 'Submitted'].includes(o.status) &&
    o.expectedDate &&
    new Date(o.expectedDate).getFullYear() === quarterYear
  )

  // ── Service types (derived from opps — no separate API route exists) ───────
  const serviceTypeMap = new Map<number, { id: number; name: string }>()
  allOpps.forEach(o => { if (o.serviceType) serviceTypeMap.set(o.serviceType.id, o.serviceType) })
  const serviceTypes = [...serviceTypeMap.values()].sort((a, b) => a.name.localeCompare(b.name))

  // ── Workload (derived from projects + opps + members) ─────────────────────
  const workload = members
    .map(m => ({
      id:               m.id,
      initial:          m.initial,
      fullName:         m.fullName,
      level:            m.level,
      active_projects:  allProjects.filter(p =>
        ['Planning', 'Fieldwork', 'Reporting'].includes(p.status) &&
        (p.micInitial === m.initial || (p.teamMembers ?? []).includes(m.initial))
      ).length,
      active_proposals: allOpps.filter(o =>
        o.status === 'In progress' &&
        OPP_TM.some((f: OppTmField) => o[f] === m.initial)
      ).length,
    }))
    .filter(m => m.active_projects > 0 || m.active_proposals > 0)
    .sort((a, b) => (b.active_projects + b.active_proposals) - (a.active_projects + a.active_proposals))

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <DashboardFilters />
      </div>

      <SummaryCards
        totalOpps={totalOpps}
        hargaTotal={hargaTotal}
        winRate={winRate}
        ongoingProjects={ongoingProjects.length}
        confirmedFee={confirmedFee}
        finishedProjects={finishedProjects.length}
        oppsList={filteredOpps as any}
        wonOppsList={wonOpps as any}
        projectsList={ongoingProjects as any}
        finishedProjectsList={finishedProjects as any}
      />

      <QuarterlySection opps={quarterlyOpps as any} year={quarterYear} />

      <OngoingProjects projects={ongoingProjects as any} />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <ProposalPipeline opps={pipeline as any} serviceTypes={serviceTypes} teamMembers={members} />
        </div>
        <div className="md:col-span-2">
          <TeamWorkload workload={workload} />
        </div>
      </div>
    </div>
  )
}

// ─── Public export (wraps with Suspense for useSearchParams) ──────────────────

export default function DashboardClient() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  )
}
