import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import ProjectsClient from './ProjectsClient'

export default async function ProjectsPage() {
  const [projects, teamMembers] = await Promise.all([
    prisma.project.findMany({
      include: { termins: { orderBy: { terminNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.teamMember.findMany({ orderBy: { fullName: 'asc' } }),
  ])

  return (
    <ProjectsClient
      projects={serialize(projects) as Parameters<typeof ProjectsClient>[0]['projects']}
      teamMembers={serialize(teamMembers)}
    />
  )
}
