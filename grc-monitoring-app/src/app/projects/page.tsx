import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import ProjectsClient from './ProjectsClient'

export default async function ProjectsPage() {
  const [projects, clients, teamMembers] = await Promise.all([
    prisma.project.findMany({
      include: { client: true, termins: { orderBy: { terminNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.findMany({ orderBy: { fullName: 'asc' } }),
    prisma.teamMember.findMany({ orderBy: { fullName: 'asc' } }),
  ])

  return (
    <ProjectsClient
      projects={serialize(projects)}
      clients={serialize(clients)}
      teamMembers={serialize(teamMembers)}
    />
  )
}
