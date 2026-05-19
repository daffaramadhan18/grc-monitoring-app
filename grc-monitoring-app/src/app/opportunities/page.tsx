import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import OpportunitiesClient from './OpportunitiesClient'

export default async function OpportunitiesPage() {
  const [opportunities, serviceTypes, teamMembers] = await Promise.all([
    prisma.opportunity.findMany({
      include: { serviceType: true, subService: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.serviceType.findMany({ orderBy: { name: 'asc' } }),
    prisma.teamMember.findMany({ orderBy: { fullName: 'asc' } }),
  ])

  return (
    <OpportunitiesClient
      opportunities={serialize(opportunities) as Parameters<typeof OpportunitiesClient>[0]['opportunities']}
      serviceTypes={serialize(serviceTypes)}
      teamMembers={serialize(teamMembers)}
    />
  )
}
