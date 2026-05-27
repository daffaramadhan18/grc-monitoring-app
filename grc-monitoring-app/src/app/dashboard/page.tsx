import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import SummaryCards from './SummaryCards'
import ProposalPipeline from './ProposalPipeline'
import TeamWorkload from './TeamWorkload'
import OngoingProjects from './OngoingProjects'
import DashboardFilters from './DashboardFilters'
import QuarterlySection from '../opportunities/QuarterlySection'

function monthRange(month: string | undefined) {
  if (!month) return null
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
  const [y, m] = month.split('-').map(Number)
  return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
}

async function getWorkload() {
  const members = await prisma.teamMember.findMany({ select: { id: true, initial: true, fullName: true, level: true } })
  const OPP_TM = ['micInitial','tm1Initial','tm2Initial','tm3Initial','tm4Initial','tm5Initial','tm6Initial'] as const

  const [projects, opps] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ['Planning', 'Fieldwork', 'Reporting'] } },
      select: { micInitial: true, teamMembers: true },
    }),
    prisma.opportunity.findMany({
      where: { status: 'In progress' },
      select: { micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
                tm4Initial: true, tm5Initial: true, tm6Initial: true },
    }),
  ])

  return members.map((m) => ({
    id:               m.id,
    initial:          m.initial,
    fullName:         m.fullName,
    level:            m.level,
    active_projects:  projects.filter((p) => p.micInitial === m.initial || p.teamMembers.includes(m.initial)).length,
    active_proposals: opps.filter((o) => OPP_TM.some((f) => o[f] === m.initial)).length,
  })).filter((m) => m.active_projects > 0 || m.active_proposals > 0)
    .sort((a, b) => (b.active_projects + b.active_proposals) - (a.active_projects + a.active_proposals))
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const range = monthRange(searchParams.month)
  const oppDateFilter = range ? { expectedDate: { gte: range.gte, lt: range.lt } } : {}
  const projDateFilter = range ? { startedDate:  { gte: range.gte, lt: range.lt } } : {}

  const quarterYear = searchParams.month ? Number(searchParams.month.split('-')[0]) : new Date().getFullYear()

  const [allFilteredOpps, ongoingProjects, finishedProjects, workload, serviceTypes, teamMembers, quarterlyOpps] = await Promise.all([
    prisma.opportunity.findMany({
      where: oppDateFilter,
      select: {
        id: true, proposalName: true, status: true, phase: true,
        expectedDate: true, harga: true,
        clientName: true, clientInitial: true,
        micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
        tm4Initial: true, tm5Initial: true, tm6Initial: true,
      },
      orderBy: { expectedDate: 'asc' },
    }),
    prisma.project.findMany({
      where: { status: { in: ['Planning', 'Fieldwork', 'Reporting'] }, ...projDateFilter },
      select: {
        id: true, proposalName: true, status: true, endDate: true, confirmedFee: true,
        clientName: true, clientInitial: true,
        termins: { select: { status: true } },
      },
      orderBy: { endDate: 'asc' },
    }),
    prisma.project.findMany({
      where: { status: 'Finish', ...projDateFilter },
      select: {
        id: true, proposalName: true, status: true, endDate: true, confirmedFee: true,
        clientName: true,
      },
      orderBy: { endDate: 'desc' },
    }),
    getWorkload(),
    prisma.serviceType.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.teamMember.findMany({ select: { id: true, initial: true, fullName: true, level: true }, orderBy: { initial: 'asc' } }),
    prisma.opportunity.findMany({
      where: {
        status: { in: ['Waiting for Result', 'In progress', 'Submitted'] },
        expectedDate: {
          gte: new Date(quarterYear, 0, 1),
          lt:  new Date(quarterYear + 1, 0, 1),
        },
      },
      select: {
        status: true, harga: true, expectedDate: true,
        proposalName: true, clientInitial: true, clientName: true,
      },
    }),
  ])

  const totalOpps  = allFilteredOpps.length
  const hargaTotal = allFilteredOpps.reduce((s, o) => s + Number(o.harga ?? 0), 0)

  const wins  = allFilteredOpps.filter((o) => o.status === 'Win').length
  const loses = allFilteredOpps.filter((o) => o.status === 'Lose').length
  const winRate = (wins + loses) > 0 ? wins / (wins + loses) * 100 : 0

  const ongoingCount  = ongoingProjects.length
  const finishedCount = finishedProjects.length

  // Card 4: sum of harga from ALL won opportunities (not month-scoped)
  const wonOpps = await prisma.opportunity.findMany({
    where: { status: 'Win' },
    select: { id: true, proposalName: true, harga: true, clientName: true, status: true },
  })
  const confirmedFee = wonOpps.reduce((s, o) => s + Number(o.harga ?? 0), 0)

  const pipeline = allFilteredOpps.filter((o) =>
    ['Waiting for Result', 'In progress', 'Submitted'].includes(o.status)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <Suspense>
          <DashboardFilters />
        </Suspense>
      </div>

      <SummaryCards
        totalOpps={totalOpps}
        hargaTotal={hargaTotal}
        winRate={winRate}
        ongoingProjects={ongoingCount}
        confirmedFee={confirmedFee}
        finishedProjects={finishedCount}
        oppsList={serialize(allFilteredOpps) as any}
        wonOppsList={serialize(wonOpps) as any}
        projectsList={serialize(ongoingProjects) as any}
        finishedProjectsList={serialize(finishedProjects) as any}
      />

      <QuarterlySection opps={serialize(quarterlyOpps) as any} year={quarterYear} />

      <OngoingProjects projects={serialize(ongoingProjects) as any} />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <ProposalPipeline opps={serialize(pipeline) as any} serviceTypes={serviceTypes} teamMembers={teamMembers} />
        </div>
        <div className="md:col-span-2">
          <TeamWorkload workload={workload} />
        </div>
      </div>
    </div>
  )
}