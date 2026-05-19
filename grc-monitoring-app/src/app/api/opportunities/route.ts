import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

async function resolveSubService(name: string | undefined | null, serviceTypeId: number) {
  if (!name) return null
  const ss = await prisma.subService.findFirst({ where: { name, serviceTypeId } })
  return ss?.id ?? null
}

export async function GET() {
  try {
    const data = await prisma.opportunity.findMany({
      include: { serviceType: true, subService: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(serialize(data))
  } catch (err: unknown) {
    console.error('[API GET /api/opportunities]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()

    // BUG 5 & 6: Required field validation
    if (!b.proposalName?.trim())
      return NextResponse.json({ error: 'proposalName is required' }, { status: 400 })
    if (!b.clientName?.trim())
      return NextResponse.json({ error: 'clientName is required' }, { status: 400 })

    // BUG 11: Negative fee validation
    if (b.harga != null && Number(b.harga) < 0)
      return NextResponse.json({ error: 'Fee tidak boleh negatif' }, { status: 400 })
    if (b.revenueCf != null && Number(b.revenueCf) < 0)
      return NextResponse.json({ error: 'Fee tidak boleh negatif' }, { status: 400 })

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

    // Auto-create project when created with Win status (same as PUT handler)
    if (data.status === 'Win') {
      const existing = await prisma.project.findFirst({ where: { opportunityId: data.id } })
      if (!existing) {
        const teamMembers = [
          data.tm1Initial, data.tm2Initial, data.tm3Initial,
          data.tm4Initial, data.tm5Initial, data.tm6Initial,
        ].filter((t): t is string => t !== null)
        await prisma.project.create({
          data: {
            opportunityId: data.id,
            proposalName:  data.proposalName,
            clientName:    data.clientName,
            clientInitial: data.clientInitial,
            micInitial:    data.micInitial,
            teamMembers,
            status:        'Planning',
          },
        })
      }
    }

    return NextResponse.json(serialize(data), { status: 201 })
  } catch (err: unknown) {
    console.error('[API POST /api/opportunities]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
