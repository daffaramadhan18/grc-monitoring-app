import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
