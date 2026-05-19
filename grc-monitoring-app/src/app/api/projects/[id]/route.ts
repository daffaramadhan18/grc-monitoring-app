import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const data = await prisma.project.findUnique({
    where: { id: Number(params.id) },
    include: { termins: { orderBy: { terminNumber: 'asc' } } },
  })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(serialize(data))
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json()
  const teamMembers = Array.isArray(b.teamMembers) ? (b.teamMembers as unknown[]).filter((t): t is string => typeof t === 'string' && t.length > 0) : []
  const data = await prisma.project.update({
    where: { id: Number(params.id) },
    data: {
      proposalName:  b.proposalName,
      clientName:    b.clientName    || null,
      clientInitial: b.clientInitial || null,
      projectOwner:  b.projectOwner  || null,
      micInitial:    b.micInitial    || null,
      teamMembers,
      startedDate:   b.startedDate   ? new Date(b.startedDate) : null,
      endDate:       b.endDate       ? new Date(b.endDate)     : null,
      status:        b.status,
      spk:           b.spk           || null,
      pks:           b.pks           || null,
      confirmedFee:  b.confirmedFee  ? BigInt(b.confirmedFee)  : null,
    },
    include: { termins: { orderBy: { terminNumber: 'asc' } } },
  })
  return NextResponse.json(serialize(data))
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.project.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
