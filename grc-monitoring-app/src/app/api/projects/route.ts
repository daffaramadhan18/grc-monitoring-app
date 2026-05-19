import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

export async function GET() {
  try {
    const data = await prisma.project.findMany({
      include: { termins: { orderBy: { terminNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(serialize(data))
  } catch (err: unknown) {
    console.error('[API GET /api/projects]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()

    // BUG 7: Required field validation
    const name = b.engagementName || b.proposalName
    if (!name?.trim())
      return NextResponse.json({ error: 'proposalName is required' }, { status: 400 })

    // BUG 11: Negative fee validation
    if (b.confirmedFee != null && Number(b.confirmedFee) < 0)
      return NextResponse.json({ error: 'Fee tidak boleh negatif' }, { status: 400 })

    // BUG 13: Date range validation
    const startedDate = b.startedDate ? new Date(b.startedDate) : null
    const endDate     = b.endDate     ? new Date(b.endDate)     : null
    if (startedDate && endDate && startedDate > endDate)
      return NextResponse.json({ error: 'startedDate tidak boleh setelah endDate' }, { status: 400 })

    const teamMembers = Array.isArray(b.teamMembers)
      ? (b.teamMembers as unknown[]).filter((t): t is string => typeof t === 'string' && t.length > 0)
      : []

    const data = await prisma.project.create({
      data: {
        opportunityId: b.opportunityId ? Number(b.opportunityId) : null,
        proposalName:  name,
        clientName:    b.clientName    || null,
        clientInitial: b.clientInitial || null,
        projectOwner:  b.projectOwner  || null,
        micInitial:    b.micInitial    || null,
        teamMembers,
        startedDate,
        endDate,
        status:        b.status        || 'Planning',
        spk:           b.spk           || null,
        pks:           b.pks           || null,
        confirmedFee:  b.confirmedFee  ? BigInt(b.confirmedFee)  : null,
      },
      include: { termins: true },
    })
    return NextResponse.json(serialize(data), { status: 201 })
  } catch (err: unknown) {
    console.error('[API POST /api/projects]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
