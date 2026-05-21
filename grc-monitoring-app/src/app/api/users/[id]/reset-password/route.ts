import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetId = Number(params.id)
    const password = await bcrypt.hash('ITGRC@2026', 12)

    await prisma.user.update({
      where: { id: targetId },
      data: { password, mustChangePassword: true },
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[API POST /api/users/[id]/reset-password]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
