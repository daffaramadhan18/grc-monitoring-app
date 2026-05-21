import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetId = Number(params.id)
    if (targetId === session.user.id) {
      return NextResponse.json({ error: 'Tidak bisa mengedit akun sendiri' }, { status: 400 })
    }

    const body = await req.json() as { role?: unknown; isAdmin?: unknown; isActive?: unknown }
    const updateData: { role?: string; isAdmin?: boolean; isActive?: boolean } = {}
    if (typeof body.role    === 'string')  updateData.role    = body.role
    if (typeof body.isAdmin  === 'boolean') updateData.isAdmin  = body.isAdmin
    if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive

    const user = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      select: USER_SELECT,
    })
    return NextResponse.json(user)
  } catch (err: unknown) {
    console.error('[API PUT /api/users/[id]]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetId = Number(params.id)
    if (targetId === session.user.id) {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    if (target.isAdmin && target.isActive) {
      const activeAdminCount = await prisma.user.count({
        where: { isAdmin: true, isActive: true },
      })
      if (activeAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Tidak bisa menghapus satu-satunya admin aktif' },
          { status: 400 }
        )
      }
    }

    await prisma.user.delete({ where: { id: targetId } })
    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    console.error('[API DELETE /api/users/[id]]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
