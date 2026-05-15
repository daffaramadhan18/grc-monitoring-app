import { prisma } from '@/lib/prisma'
import TeamClient from './TeamClient'

const TM_FIELDS = ['micInitial','tm1Initial','tm2Initial','tm3Initial','tm4Initial','tm5Initial','tm6Initial'] as const

export default async function TeamPage() {
  const [members, activeProjects, activeOpps] = await Promise.all([
    prisma.teamMember.findMany({ orderBy: { fullName: 'asc' } }),
    prisma.project.findMany({
      where: { status: { in: ['Fieldwork', 'Reporting'] } },
      select: { micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
                tm4Initial: true, tm5Initial: true, tm6Initial: true },
    }),
    // Proposal load = In progress only
    prisma.opportunity.findMany({
      where: { status: 'In progress' },
      select: { micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
                tm4Initial: true, tm5Initial: true, tm6Initial: true },
    }),
  ])

  const alloc: Record<string, { projects: number; proposals: number }> = {}
  for (const m of members) alloc[m.initial] = { projects: 0, proposals: 0 }

  for (const p of activeProjects) {
    for (const f of TM_FIELDS) {
      const ini = p[f]
      if (ini && alloc[ini]) alloc[ini].projects++
    }
  }
  for (const o of activeOpps) {
    for (const f of TM_FIELDS) {
      const ini = o[f]
      if (ini && alloc[ini]) alloc[ini].proposals++
    }
  }

  return <TeamClient members={members} allocation={alloc} />
}
