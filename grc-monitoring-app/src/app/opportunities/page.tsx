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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      opportunities={serialize(opportunities) as any}
      serviceTypes={serialize(serviceTypes)}
      teamMembers={serialize(teamMembers)}
    />
  )
}
