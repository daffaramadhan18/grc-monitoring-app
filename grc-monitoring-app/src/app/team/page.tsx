import { prisma } from '@/lib/prisma'
import TeamClient from './TeamClient'

export const dynamic = 'force-dynamic'

const OPP_TM = ['micInitial','tm1Initial','tm2Initial','tm3Initial','tm4Initial','tm5Initial','tm6Initial'] as const
const FINISHED_OPP_STATUSES = ['Win', 'Lose', 'Withdraw', 'Cancelled', 'Transfer to others'] as const

export default async function TeamPage() {
  const [members, activeProjects, activeOpps, finishedProjects, finishedOpps] = await Promise.all([
    prisma.teamMember.findMany({ orderBy: { fullName: 'asc' } }),
    prisma.project.findMany({
      where: { status: { in: ['Planning', 'Fieldwork', 'Reporting'] } },
      select: {
        id: true, proposalName: true, status: true, endDate: true,
        clientName: true, clientInitial: true,
        micInitial: true, teamMembers: true,
      },
    }),
    prisma.opportunity.findMany({
      where: { status: 'In progress' },
      select: {
        id: true, proposalName: true, status: true,
        clientInitial: true,
        micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
        tm4Initial: true, tm5Initial: true, tm6Initial: true,
      },
    }),
    prisma.project.findMany({
      where: { status: 'Finish' },
      select: { id: true, proposalName: true, clientName: true, micInitial: true, teamMembers: true },
    }),
    prisma.opportunity.findMany({
      where: { status: { in: [...FINISHED_OPP_STATUSES] } },
      select: {
        id: true, proposalName: true, status: true,
        clientInitial: true,
        micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
        tm4Initial: true, tm5Initial: true, tm6Initial: true,
      },
    }),
  ])

  const alloc: Record<string, { projects: number; proposals: number; finished: number; finishedProposals: number }> = {}
  const details: Record<string, {
    projects: typeof activeProjects
    proposals: typeof activeOpps
    finishedProjects: typeof finishedProjects
    finishedProposals: typeof finishedOpps
  }> = {}

  for (const m of members) {
    const memberProjects         = activeProjects.filter((p) => p.micInitial === m.initial || p.teamMembers.includes(m.initial))
    const memberProposals        = activeOpps.filter((o) => OPP_TM.some((f) => o[f] === m.initial))
    const memberFinished         = finishedProjects.filter((p) => p.micInitial === m.initial || p.teamMembers.includes(m.initial))
    const memberFinishedProposals = finishedOpps.filter((o) => OPP_TM.some((f) => o[f] === m.initial))
    alloc[m.initial]   = {
      projects: memberProjects.length,
      proposals: memberProposals.length,
      finished: memberFinished.length,
      finishedProposals: memberFinishedProposals.length,
    }
    details[m.initial] = {
      projects: memberProjects,
      proposals: memberProposals,
      finishedProjects: memberFinished,
      finishedProposals: memberFinishedProposals,
    }
  }

  // Serialize dates
  const serializedDetails: Record<string, {
    projects: { id: number; proposalName: string; status: string; endDate: string | null; clientInitial: string | null; clientName: string | null }[]
    proposals: { id: number; proposalName: string; status: string; clientInitial: string | null }[]
    finishedProjects: { id: number; proposalName: string; clientName: string | null }[]
    finishedProposals: { id: number; proposalName: string; status: string; clientInitial: string | null }[]
  }> = {}

  for (const [ini, d] of Object.entries(details)) {
    serializedDetails[ini] = {
      projects: d.projects.map((p) => ({
        id: p.id,
        proposalName: p.proposalName,
        status: p.status,
        endDate: p.endDate ? p.endDate.toISOString().slice(0, 10) : null,
        clientInitial: p.clientInitial ?? null,
        clientName: p.clientName ?? null,
      })),
      proposals: d.proposals.map((o) => ({
        id: o.id,
        proposalName: o.proposalName,
        status: o.status,
        clientInitial: o.clientInitial ?? null,
      })),
      finishedProjects: d.finishedProjects.map((p) => ({
        id: p.id,
        proposalName: p.proposalName,
        clientName: p.clientName ?? null,
      })),
      finishedProposals: d.finishedProposals.map((o) => ({
        id: o.id,
        proposalName: o.proposalName,
        status: o.status,
        clientInitial: o.clientInitial ?? null,
      })),
    }
  }

  return <TeamClient members={members} allocation={alloc} details={serializedDetails} />
}
