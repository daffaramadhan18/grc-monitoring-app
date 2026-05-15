import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
  const { updates } = await req.json()
  let updated = 0
  for (const item of updates) {
    const { id, ...data } = item
    // Convert numeric strings back to numbers
    if (data.harga != null) data.harga = Number(data.harga)
    if (data.revenueCf != null) data.revenueCf = Number(data.revenueCf)
    if (data.rrPercentage != null) data.rrPercentage = Number(data.rrPercentage)
    if (data.probability != null) data.probability = Number(data.probability)
    if (data.serviceTypeId != null) data.serviceTypeId = Number(data.serviceTypeId)
    if (data.subServiceId != null) data.subServiceId = Number(data.subServiceId)
    await prisma.opportunity.update({ where: { id }, data })
    updated++
  }
  return NextResponse.json({ success: true, updated })
}
