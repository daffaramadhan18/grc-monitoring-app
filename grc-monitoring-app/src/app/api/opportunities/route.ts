import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

async function resolveSubService(name: string | undefined | null, serviceTypeId: number) {
  if (!name) return null
  const ss = await prisma.subService.findFirst({ where: { name, serviceTypeId } })
  return ss?.id ?? null
}

export async function GET() {
  const data = await prisma.opportunity.findMany({
    include: { serviceType: true, subService: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(serialize(data))
}

export async function POST(req: NextRequest) {
  const b = await req.json()
  const serviceTypeId = b.serviceTypeId ? Number(b.serviceTypeId) : null
  const subServiceId  = serviceTypeId ? await resolveSubService(b.subServiceId || b.subServiceName, serviceTypeId) : null

  const data = await prisma.opportunity.create({
    data: {
      proposalName:  b.proposalName,
      clientName:    b.clientName    || null,
      clientInitial: b.clientInitial || null,
      serviceTypeId,
      subServiceId,
      phase:         b.phase         || null,
      status:        b.status        || 'In progress',
      probability:   b.probability   || null,
      riskLevel:     b.riskLevel     || null,
      harga:         b.harga         ? BigInt(b.harga)     : null,
      revenueCf:     b.revenueCf     ? BigInt(b.revenueCf) : null,
      rrPercentage:  b.rrPercentage  ? Number(b.rrPercentage) : null,
      expectedDate:  b.expectedDate  ? new Date(b.expectedDate) : null,
      submittedDate: b.submittedDate ? new Date(b.submittedDate): null,
      notes:         b.notes         || null,
      micInitial:    b.micInitial    || null,
      tm1Initial:    b.tm1Initial    || null,
      tm2Initial:    b.tm2Initial    || null,
      tm3Initial:    b.tm3Initial    || null,
      tm4Initial:    b.tm4Initial    || null,
      tm5Initial:    b.tm5Initial    || null,
      tm6Initial:    b.tm6Initial    || null,
    },
    include: { serviceType: true, subService: true },
  })
  return NextResponse.json(serialize(data), { status: 201 })
}
