import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!session.user.mustChangePassword) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { newPassword?: unknown }
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password minimal 8 karakter.' }, { status: 400 })
  }

  const hash = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hash, mustChangePassword: false },
  })

  return NextResponse.json({ ok: true })
}
