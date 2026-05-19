import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
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
