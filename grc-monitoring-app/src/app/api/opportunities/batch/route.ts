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
        if (data.harga != null) data.harga = Number(data.harga)
        if (data.revenueCf != null) data.revenueCf = Number(data.revenueCf)
        if (data.rrPercentage != null) data.rrPercentage = Number(data.rrPercentage)
        if (data.serviceTypeId != null) data.serviceTypeId = Number(data.serviceTypeId)
        if (data.subServiceId != null) data.subServiceId = Number(data.subServiceId)
        await prisma.opportunity.update({ where: { id }, data })
        updated++
      } catch (err: unknown) {
        failed.push({ id, error: err instanceof Error ? err.message : String(err) })
      }
    }

    return NextResponse.json({ success: failed.length === 0, updated, failed })
  } catch (err: unknown) {
    console.error('[API PATCH /api/opportunities/batch]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
