import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const OPP_TM_FIELDS = ['micInitial','tm1Initial','tm2Initial','tm3Initial','tm4Initial','tm5Initial','tm6Initial'] as const

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const member = await prisma.teamMember.findUnique({ where: { id: Number(params.id) } })
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(member)
  } catch (err: unknown) {
    console.error('[API GET /api/team/[id]]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'Intern') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const id = Number(params.id)
    const { fullName, initial, level } = await req.json()
    if (!fullName || !initial || !level)
      return NextResponse.json({ error: 'fullName, initial, level are required' }, { status: 400 })

    const upper = initial.toUpperCase()
    const conflict = await prisma.teamMember.findFirst({
      where: { initial: upper, NOT: { id } },
    })
    if (conflict)
      return NextResponse.json({ error: `Initial "${upper}" sudah dipakai` }, { status: 409 })

    const data = await prisma.teamMember.update({
      where: { id },
      data: { fullName, initial: upper, level },
    })
    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('[API PUT /api/team/[id]]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'Intern') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const id = Number(params.id)
    const member = await prisma.teamMember.findUnique({ where: { id } })
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const ini = member.initial
    const oppAssignedFilter = OPP_TM_FIELDS.map((f) => ({ [f]: ini }))

    const [activeProject, activeOpp] = await Promise.all([
      prisma.project.findFirst({
        where: {
          status: { in: ['Planning', 'Fieldwork', 'Reporting'] },
          OR: [{ micInitial: ini }, { teamMembers: { has: ini } }],
        },
        select: { id: true },
      }),
      prisma.opportunity.findFirst({
        where: {
          status: { in: ['Waiting for Result', 'Backlog', 'In progress'] },
          OR: oppAssignedFilter,
        },
        select: { id: true },
      }),
    ])

    if (activeProject)
      return NextResponse.json({ error: `${ini} masih assigned ke project aktif. Unassign dulu sebelum hapus.` }, { status: 409 })
    if (activeOpp)
      return NextResponse.json({ error: `${ini} masih assigned ke opportunity aktif. Unassign dulu sebelum hapus.` }, { status: 409 })

    await prisma.teamMember.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    console.error('[API DELETE /api/team/[id]]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
