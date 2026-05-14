import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import SummaryCards from './SummaryCards'
import ProposalPipeline from './ProposalPipeline'
import TeamWorkload from './TeamWorkload'
import OngoingProjects from './OngoingProjects'

async function getWorkload() {
  const members = await prisma.teamMember.findMany({ select: { id: true, initial: true, fullName: true, level: true } })
  const [projects, opps] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ['Fieldwork', 'Reporting'] } },
      select: { micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
                tm4Initial: true, tm5Initial: true, tm6Initial: true },
    }),
    prisma.opportunity.findMany({
      where: { status: { in: ['Waiting for Result', 'Backlog', 'In progress'] } },
      select: { micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
                tm4Initial: true, tm5Initial: true, tm6Initial: true },
    }),
  ])

  const TM = ['micInitial','tm1Initial','tm2Initial','tm3Initial','tm4Initial','tm5Initial','tm6Initial'] as const

  return members.map((m) => ({
    id:               m.id,
    initial:          m.initial,
    fullName:         m.fullName,
    level:            m.level,
    active_projects:  projects.filter((p) => TM.some((f) => p[f] === m.initial)).length,
    active_proposals: opps.filter((o) => TM.some((f) => o[f] === m.initial)).length,
  })).filter((m) => m.active_projects > 0 || m.active_proposals > 0)
    .sort((a, b) => (b.active_projects + b.active_proposals) - (a.active_projects + a.active_proposals))
}

export default async function DashboardPage() {
  const [
    oppsWinLose,
    activeProposals,
    ongoingProjectsCount,
    confirmedFeeAgg,
    pipeline,
    workload,
    ongoingProjects,
  ] = await Promise.all([
    prisma.opportunity.findMany({
      where: { status: { in: ['Win', 'Lose', 'Withdraw', 'Cancelled'] } },
      select: { status: true },
    }),
    prisma.opportunity.count({
      where: { status: { in: ['Waiting for Result', 'In progress', 'Backlog'] } },
    }),
    prisma.project.count({
      where: { status: { in: ['Fieldwork', 'Reporting'] } },
    }),
    prisma.project.aggregate({
      where: { status: { in: ['Fieldwork', 'Reporting'] } },
      _sum: { confirmedFee: true },
    }),
    prisma.opportunity.findMany({
      where: { status: { in: ['Waiting for Result', 'In progress', 'Backlog'] } },
      select: {
        id: true, proposalName: true, status: true, phase: true, expectedDate: true,
        client: { select: { initial: true, fullName: true } },
        micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
        tm4Initial: true, tm5Initial: true, tm6Initial: true,
      },
      orderBy: [{ expectedDate: 'asc' }],
    }),
    getWorkload(),
    prisma.project.findMany({
      where: { status: { in: ['Fieldwork', 'Reporting'] } },
      select: {
        id: true, proposalName: true, status: true, endDate: true,
        client: { select: { initial: true, fullName: true } },
        termins: { select: { status: true } },
      },
      orderBy: { endDate: 'asc' },
    }),
  ])

  const wins  = oppsWinLose.filter((o) => o.status === 'Win').length
  const total = oppsWinLose.length
  const winRate     = total > 0 ? Math.round((wins / total) * 100) : 0
  const confirmedFee = Number(confirmedFeeAgg._sum.confirmedFee ?? 0)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>

      <SummaryCards
        activeProposals={activeProposals}
        ongoingProjects={ongoingProjectsCount}
        winRate={winRate}
        confirmedFee={confirmedFee}
      />

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <ProposalPipeline opps={serialize(pipeline) as any} />
        </div>
        <div className="col-span-2">
          <TeamWorkload workload={workload} />
        </div>
      </div>

      <OngoingProjects projects={serialize(ongoingProjects) as any} />
    </div>
  )
}
