import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { proposalName, clientInitial, clientName, micInitial, teamMembers } = await req.json()

  if (!proposalName)
    return NextResponse.json({ error: 'proposalName required' }, { status: 400 })

  const existing = await prisma.project.findFirst({
    where: { proposalName, clientInitial: clientInitial || null },
    select: { id: true },
  })

  if (existing)
    return NextResponse.json({ error: 'Already exists in Active Engagements' }, { status: 409 })

  const project = await prisma.project.create({
    data: {
      proposalName,
      clientInitial: clientInitial || null,
      clientName:    clientName    || null,
      micInitial:    micInitial    || null,
      teamMembers:   Array.isArray(teamMembers) ? (teamMembers as unknown[]).filter((t): t is string => typeof t === 'string' && t.length > 0) : [],
      status:        'Waiting to Start',
    },
    include: { termins: true },
  })

  return NextResponse.json(serialize(project), { status: 201 })
}
