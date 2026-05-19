import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

export async function GET() {
  const data = await prisma.project.findMany({
    include: { termins: { orderBy: { terminNumber: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(serialize(data))
}

export async function POST(req: NextRequest) {
  const b = await req.json()
  const teamMembers = Array.isArray(b.teamMembers) ? (b.teamMembers as unknown[]).filter((t): t is string => typeof t === 'string' && t.length > 0) : []

  const data = await prisma.project.create({
    data: {
      opportunityId: b.opportunityId ? Number(b.opportunityId) : null,
      proposalName:  b.engagementName || b.proposalName,
      clientName:    b.clientName    || null,
      clientInitial: b.clientInitial || null,
      projectOwner:  b.projectOwner  || null,
      micInitial:    b.micInitial    || null,
      teamMembers,
      startedDate:   b.startedDate   ? new Date(b.startedDate) : null,
      endDate:       b.endDate       ? new Date(b.endDate)     : null,
      status:        b.status        || 'Planning',
      spk:           b.spk           || null,
      pks:           b.pks           || null,
      confirmedFee:  b.confirmedFee  ? BigInt(b.confirmedFee)  : null,
    },
    include: { termins: true },
  })
  return NextResponse.json(serialize(data), { status: 201 })
}
