import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import OpportunitiesClient from './OpportunitiesClient'

export default async function OpportunitiesPage() {
  const [opportunities, clients, serviceTypes, subServices, teamMembers] = await Promise.all([
    prisma.opportunity.findMany({
      include: { client: true, serviceType: true, subService: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.findMany({ orderBy: { fullName: 'asc' } }),
    prisma.serviceType.findMany({ orderBy: { name: 'asc' } }),
    prisma.subService.findMany({ orderBy: { name: 'asc' } }),
    prisma.teamMember.findMany({ orderBy: { fullName: 'asc' } }),
  ])

  return (
    <OpportunitiesClient
      opportunities={serialize(opportunities)}
      clients={serialize(clients)}
      serviceTypes={serialize(serviceTypes)}
      subServices={serialize(subServices)}
      teamMembers={serialize(teamMembers)}
    />
  )
}
