import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const data = await prisma.project.findUnique({
    where: { id: Number(params.id) },
    include: { client: true, termins: { orderBy: { terminNumber: 'asc' } } },
  })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(serialize(data))
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json()
  const data = await prisma.project.update({
    where: { id: Number(params.id) },
    data: {
      proposalName:  b.proposalName,
      clientId:      Number(b.clientId),
      projectOwner:  b.projectOwner  || null,
      micInitial:    b.micInitial    || null,
      tm1Initial:    b.tm1Initial    || null,
      tm2Initial:    b.tm2Initial    || null,
      tm3Initial:    b.tm3Initial    || null,
      tm4Initial:    b.tm4Initial    || null,
      tm5Initial:    b.tm5Initial    || null,
      tm6Initial:    b.tm6Initial    || null,
      startedDate:   b.startedDate   ? new Date(b.startedDate) : null,
      endDate:       b.endDate       ? new Date(b.endDate)     : null,
      status:        b.status,
      spk:           b.spk           || null,
      pks:           b.pks           || null,
      confirmedFee:  b.confirmedFee  ? BigInt(b.confirmedFee)  : null,
      alokasiHours:  b.alokasiHours  ? Number(b.alokasiHours)  : null,
      currentHours:  b.currentHours  ? Number(b.currentHours)  : null,
    },
    include: { client: true, termins: { orderBy: { terminNumber: 'asc' } } },
  })
  return NextResponse.json(serialize(data))
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.project.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
