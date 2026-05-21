import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { LEVEL_TO_ROLE } from '@/lib/level-to-role'

const USER_SELECT = {
  id: true,
  username: true,
  role: true,
  isAdmin: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  teamMember: {
    select: { id: true, fullName: true, initial: true, level: true },
  },
} as const

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const users = await prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(users)
  } catch (err: unknown) {
    console.error('[API GET /api/users]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json() as {
      username?: unknown
      role?: unknown
      isAdmin?: unknown
      teamMemberId?: unknown
    }

    const username     = typeof body.username === 'string' ? body.username.trim() : ''
    const isAdmin      = body.isAdmin === true
    const teamMemberId = typeof body.teamMemberId === 'number' ? body.teamMemberId : null

    if (!username) return NextResponse.json({ error: 'username wajib diisi' }, { status: 400 })

    let role: string

    if (teamMemberId !== null) {
      const member = await prisma.teamMember.findUnique({ where: { id: teamMemberId } })
      if (!member) {
        return NextResponse.json({ error: 'Anggota tim tidak ditemukan' }, { status: 400 })
      }
      const alreadyLinked = await prisma.user.findFirst({ where: { teamMemberId } })
      if (alreadyLinked) {
        return NextResponse.json(
          { error: `Anggota tim ini sudah terhubung ke user "${alreadyLinked.username}"` },
          { status: 409 }
        )
      }
      role = LEVEL_TO_ROLE[member.level] ?? member.level
    } else {
      role = typeof body.role === 'string' ? body.role.trim() : ''
      if (!role) return NextResponse.json({ error: 'role wajib diisi' }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) {
      return NextResponse.json({ error: `Username "${username}" sudah dipakai` }, { status: 409 })
    }

    const password = await bcrypt.hash('ITGRC@2026', 12)
    const user = await prisma.user.create({
      data: {
        username,
        password,
        role,
        isAdmin,
        isActive: true,
        mustChangePassword: true,
        ...(teamMemberId !== null ? { teamMemberId } : {}),
      },
      select: USER_SELECT,
    })
    return NextResponse.json(user, { status: 201 })
  } catch (err: unknown) {
    console.error('[API POST /api/users]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
