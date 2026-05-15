import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

async function findOrCreateClient(fullName: string) {
  const existing = await prisma.client.findFirst({
    where: { fullName: { equals: fullName, mode: 'insensitive' } },
  })
  if (existing) return existing.id
  const initial = fullName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 4) || fullName.slice(0, 4).toUpperCase()
  const taken = await prisma.client.findUnique({ where: { initial } })
  const finalInitial = taken ? initial + '2' : initial
  const created = await prisma.client.create({ data: { fullName, initial: finalInitial } })
  return created.id
}

export async function GET() {
  const data = await prisma.project.findMany({
    include: { client: true, termins: { orderBy: { terminNumber: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(serialize(data))
}

export async function POST(req: NextRequest) {
  const b        = await req.json()
  const clientId = await findOrCreateClient(b.clientName || b.proposalName)

  const data = await prisma.project.create({
    data: {
      opportunityId: b.opportunityId ? Number(b.opportunityId) : null,
      proposalName:  b.engagementName || b.proposalName,
      clientId,
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
      status:        b.status        || 'Planning',
      spk:           b.spk           || null,
      pks:           b.pks           || null,
      confirmedFee:  b.confirmedFee  ? BigInt(b.confirmedFee)  : null,
    },
    include: { client: true, termins: true },
  })
  return NextResponse.json(serialize(data), { status: 201 })
}
