import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const USER_SELECT = {
  id: true,
  username: true,
  role: true,
  isAdmin: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as { username?: unknown; role?: unknown; isAdmin?: unknown }
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const role     = typeof body.role    === 'string' ? body.role.trim()     : ''
    const isAdmin  = body.isAdmin === true

    if (!username) return NextResponse.json({ error: 'username wajib diisi' }, { status: 400 })
    if (!role)     return NextResponse.json({ error: 'role wajib diisi' }, { status: 400 })

    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) return NextResponse.json({ error: `Username "${username}" sudah dipakai` }, { status: 409 })

    const password = await bcrypt.hash('ITGRC@2026', 12)
    const user = await prisma.user.create({
      data: { username, password, role, isAdmin, isActive: true, mustChangePassword: true },
      select: USER_SELECT,
    })
    return NextResponse.json(user, { status: 201 })
  } catch (err: unknown) {
    console.error('[API POST /api/users]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
