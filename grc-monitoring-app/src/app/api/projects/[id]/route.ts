import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { authOptions } from '@/lib/auth'
import { stripFinancial } from '@/lib/financial'

function isP2025(err: unknown): boolean {
  return !!(err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === 'P2025')
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const role = session?.user?.role ?? ''
    const data = await prisma.project.findUnique({
      where: { id: Number(params.id) },
      include: { termins: { orderBy: { terminNumber: 'asc' } } },
    })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(stripFinancial(serialize(data), role))
  } catch (err: unknown) {
    console.error('[API GET /api/projects/[id]]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'Intern') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const b = await req.json()

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

    const data = await prisma.project.update({
      where: { id: Number(params.id) },
      data: {
        proposalName:  b.proposalName,
        clientName:    b.clientName    || null,
        clientInitial: b.clientInitial || null,
        projectOwner:  b.projectOwner  || null,
        micInitial:    b.micInitial    || null,
        teamMembers,
        startedDate,
        endDate,
        status:        b.status,
        spk:           b.spk           || null,
        pks:           b.pks           || null,
        confirmedFee:  b.confirmedFee  ? BigInt(b.confirmedFee)  : null,
      },
      include: { termins: { orderBy: { terminNumber: 'asc' } } },
    })
    return NextResponse.json(serialize(data))
  } catch (err: unknown) {
    if (isP2025(err)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    console.error('[API PUT /api/projects/[id]]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'Intern') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await prisma.project.delete({ where: { id: Number(params.id) } })
    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    if (isP2025(err)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    console.error('[API DELETE /api/projects/[id]]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
