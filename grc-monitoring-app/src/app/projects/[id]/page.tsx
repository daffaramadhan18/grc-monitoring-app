import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { notFound } from 'next/navigation'
import ProjectDetailClient from './ProjectDetailClient'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (isNaN(id)) notFound()

  const [project, teamMembers] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { termins: { orderBy: { terminNumber: 'asc' } } },
    }),
    prisma.teamMember.findMany({ orderBy: { fullName: 'asc' } }),
  ])

  if (!project) notFound()

  return (
    <ProjectDetailClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      project={serialize(project) as any}
      teamMembers={serialize(teamMembers)}
    />
  )
}
