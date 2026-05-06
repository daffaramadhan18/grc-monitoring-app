import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { notFound } from 'next/navigation'
import ProjectDetailClient from './ProjectDetailClient'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (isNaN(id)) notFound()

  const [project, clients, teamMembers] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { client: true, termins: { orderBy: { terminNumber: 'asc' } } },
    }),
    prisma.client.findMany({ orderBy: { fullName: 'asc' } }),
    prisma.teamMember.findMany({ orderBy: { fullName: 'asc' } }),
  ])

  if (!project) notFound()

  return (
    <ProjectDetailClient
      project={serialize(project)}
      clients={serialize(clients)}
      teamMembers={serialize(teamMembers)}
    />
  )
}
