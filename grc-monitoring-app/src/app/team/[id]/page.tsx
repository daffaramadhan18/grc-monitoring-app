import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { serialize } from '@/lib/serialize'
import TeamMemberClient from './TeamMemberClient'

const OPP_TM_FIELDS = ['micInitial','tm1Initial','tm2Initial','tm3Initial','tm4Initial','tm5Initial','tm6Initial'] as const

export default async function TeamMemberPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (isNaN(id)) notFound()

  const member = await prisma.teamMember.findUnique({ where: { id } })
  if (!member) notFound()

  const oppOrFilter = OPP_TM_FIELDS.map((f) => ({ [f]: member.initial }))
  const projOrFilter = [
    { micInitial: member.initial },
    { teamMembers: { has: member.initial } },
  ]

  const [proposals, projects, finishedProjects] = await Promise.all([
    prisma.opportunity.findMany({
      where: {
        status: 'In progress',
        OR: oppOrFilter,
      },
      include: { serviceType: true },
      orderBy: { expectedDate: 'asc' },
    }),
    prisma.project.findMany({
      where: {
        status: { in: ['Planning', 'Fieldwork', 'Reporting'] },
        OR: projOrFilter,
      },
      include: { termins: true },
      orderBy: { startedDate: 'asc' },
    }),
    prisma.project.findMany({
      where: {
        status: 'Finish',
        OR: projOrFilter,
      },
      include: { termins: true },
      orderBy: { startedDate: 'desc' },
    }),
  ])

  return (
    <TeamMemberClient
      member={member}
      proposals={proposals.map((o) => serialize(o)) as unknown as Parameters<typeof TeamMemberClient>[0]['proposals']}
      projects={projects.map((p) => serialize(p)) as unknown as Parameters<typeof TeamMemberClient>[0]['projects']}
      finishedProjects={finishedProjects.map((p) => serialize(p)) as unknown as Parameters<typeof TeamMemberClient>[0]['finishedProjects']}
    />
  )
}
