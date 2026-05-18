import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
  const { updates } = await req.json()
  let updated = 0
  for (const item of updates) {
    const { id, ...data } = item
    if (data.confirmedFee != null) data.confirmedFee = Number(data.confirmedFee)
    await prisma.project.update({ where: { id }, data })
    updated++
  }
  return NextResponse.json({ success: true, updated })
}
