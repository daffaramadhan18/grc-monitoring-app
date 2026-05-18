import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import OpportunityNewPage from './OpportunityNewPage'

export default async function Page() {
  const [serviceTypes, teamMembers] = await Promise.all([
    prisma.serviceType.findMany({ include: { subServices: true }, orderBy: { name: 'asc' } }),
    prisma.teamMember.findMany({ orderBy: { initial: 'asc' } }),
  ])

  return (
    <OpportunityNewPage
      serviceTypes={serialize(serviceTypes) as any}
      teamMembers={serialize(teamMembers) as any}
    />
  )
}
