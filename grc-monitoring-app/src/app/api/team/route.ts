import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const data = await prisma.teamMember.findMany({ orderBy: { fullName: 'asc' } })
    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('[API GET /api/team]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { fullName, initial, level } = await req.json()
    if (!fullName || !initial || !level)
      return NextResponse.json({ error: 'fullName, initial, level are required' }, { status: 400 })

    const exists = await prisma.teamMember.findUnique({ where: { initial: initial.toUpperCase() } })
    if (exists)
      return NextResponse.json({ error: `Initial "${initial}" sudah dipakai` }, { status: 409 })

    const data = await prisma.teamMember.create({
      data: { fullName, initial: initial.toUpperCase(), level },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    console.error('[API POST /api/team]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
