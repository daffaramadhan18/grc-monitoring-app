import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

async function resolveSubService(name: string | undefined | null, serviceTypeId: number) {
  if (!name) return null
  const ss = await prisma.subService.findFirst({ where: { name, serviceTypeId } })
  return ss?.id ?? null
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const data = await prisma.opportunity.findUnique({
    where: { id: Number(params.id) },
    include: { serviceType: true, subService: true },
  })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(serialize(data))
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const b  = await req.json()
    const serviceTypeId = b.serviceTypeId ? Number(b.serviceTypeId) : null
    const subServiceId = serviceTypeId
      ? await resolveSubService(b.subServiceId || b.subServiceName, serviceTypeId)
      : null

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        proposalName:  b.proposalName,
        clientName:    b.clientName    || null,
        clientInitial: b.clientInitial || null,
        serviceTypeId,
        subServiceId,
        phase:         b.phase         || null,
        status:        b.status,
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

    // Auto-create project when status becomes Win
    if (updated.status === 'Win') {
      const existing = await prisma.project.findFirst({ where: { opportunityId: id } })
      if (!existing) {
        const teamMembers = [
          updated.tm1Initial, updated.tm2Initial, updated.tm3Initial,
          updated.tm4Initial, updated.tm5Initial, updated.tm6Initial,
        ].filter((t): t is string => t !== null)
        await prisma.project.create({
          data: {
            opportunityId: id,
            proposalName:  updated.proposalName,
            clientName:    updated.clientName,
            clientInitial: updated.clientInitial,
            micInitial:    updated.micInitial,
            teamMembers,
            status:        'Planning',
          },
        })
      }
    }

    return NextResponse.json(serialize(updated))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.opportunity.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
