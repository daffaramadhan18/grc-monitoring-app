import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { serialize } from '@/lib/serialize'
import TeamMemberClient from './TeamMemberClient'

const TM_FIELDS = ['micInitial','tm1Initial','tm2Initial','tm3Initial','tm4Initial','tm5Initial','tm6Initial'] as const

export default async function TeamMemberPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (isNaN(id)) notFound()

  const member = await prisma.teamMember.findUnique({ where: { id } })
  if (!member) notFound()

  const orFilter = TM_FIELDS.map((f) => ({ [f]: member.initial }))

  const [proposals, projects] = await Promise.all([
    prisma.opportunity.findMany({
      where: {
        status: { in: ['In progress', 'Waiting for Result', 'Submitted'] },
        OR: orFilter,
      },
      include: { serviceType: true },
      orderBy: { expectedDate: 'asc' },
    }),
    prisma.project.findMany({
      where: {
        status: { in: ['Fieldwork', 'Reporting'] },
        OR: orFilter,
      },
      include: { termins: true },
      orderBy: { startedDate: 'asc' },
    }),
  ])

  return (
    <TeamMemberClient
      member={member}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      proposals={proposals.map((o) => serialize(o)) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projects={projects.map((p) => serialize(p)) as any}
    />
  )
}
