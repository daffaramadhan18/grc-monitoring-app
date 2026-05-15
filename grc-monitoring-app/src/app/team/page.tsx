import { prisma } from '@/lib/prisma'
import TeamClient from './TeamClient'

const TM_FIELDS = ['micInitial','tm1Initial','tm2Initial','tm3Initial','tm4Initial','tm5Initial','tm6Initial'] as const

export default async function TeamPage() {
  const [members, activeProjects, activeOpps] = await Promise.all([
    prisma.teamMember.findMany({ orderBy: { fullName: 'asc' } }),
    prisma.project.findMany({
      where: { status: { in: ['Fieldwork', 'Reporting'] } },
      select: {
        id: true, proposalName: true, status: true, endDate: true,
        clientName: true, clientInitial: true,
        micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
        tm4Initial: true, tm5Initial: true, tm6Initial: true,
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
  ])

  const alloc: Record<string, { projects: number; proposals: number }> = {}
  const details: Record<string, {
    projects: typeof activeProjects
    proposals: typeof activeOpps
  }> = {}

  for (const m of members) {
    alloc[m.initial]   = { projects: 0, proposals: 0 }
    details[m.initial] = { projects: [], proposals: [] }
  }

  for (const p of activeProjects) {
    for (const f of TM_FIELDS) {
      const ini = p[f]
      if (ini && alloc[ini]) {
        alloc[ini].projects++
        details[ini].projects.push(p)
      }
    }
  }
  for (const o of activeOpps) {
    for (const f of TM_FIELDS) {
      const ini = o[f]
      if (ini && alloc[ini]) {
        alloc[ini].proposals++
        details[ini].proposals.push(o)
      }
    }
  }

  // Serialize dates
  const serializedDetails: Record<string, {
    projects: { id: number; proposalName: string; status: string; endDate: string | null; clientInitial: string | null; clientName: string | null }[]
    proposals: { id: number; proposalName: string; status: string; clientInitial: string | null }[]
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
    }
  }

  return <TeamClient members={members} allocation={alloc} details={serializedDetails} />
}
