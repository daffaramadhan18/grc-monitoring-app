import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'Intern') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { updates } = await req.json()
    let updated = 0
    const failed: { id: number; error: string }[] = []

    for (const item of updates) {
      const { id, ...data } = item
      try {
        if (data.confirmedFee != null) data.confirmedFee = Number(data.confirmedFee)
        await prisma.project.update({ where: { id }, data })
        updated++
      } catch (err: unknown) {
        failed.push({ id, error: err instanceof Error ? err.message : String(err) })
      }
    }

    return NextResponse.json({ success: failed.length === 0, updated, failed })
  } catch (err: unknown) {
    console.error('[API PATCH /api/projects/batch]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
