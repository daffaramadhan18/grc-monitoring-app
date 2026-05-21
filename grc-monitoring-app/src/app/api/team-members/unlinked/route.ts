import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const members = await prisma.teamMember.findMany({
      where: { user: null },
      select: { id: true, fullName: true, initial: true, level: true },
      orderBy: { fullName: 'asc' },
    })
    return NextResponse.json(members)
  } catch (err: unknown) {
    console.error('[API GET /api/team-members/unlinked]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
