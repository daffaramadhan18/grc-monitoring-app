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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projects={serialize(projects) as any}
      teamMembers={serialize(teamMembers)}
    />
  )
}
