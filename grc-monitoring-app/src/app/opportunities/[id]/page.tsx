import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { serialize } from '@/lib/serialize'
import OpportunityEditPage from './OpportunityEditPage'

export default async function Page({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const [opp, serviceTypes, teamMembers] = await Promise.all([
    prisma.opportunity.findUnique({
      where: { id },
      include: {
        serviceType: true,
        subService: true,
      },
    }),
    prisma.serviceType.findMany({ include: { subServices: true }, orderBy: { name: 'asc' } }),
    prisma.teamMember.findMany({ orderBy: { initial: 'asc' } }),
  ])

  if (!opp) notFound()

  return (
    <OpportunityEditPage
      opp={serialize(opp) as any}
      serviceTypes={serialize(serviceTypes) as any}
      teamMembers={serialize(teamMembers) as any}
    />
  )
}
