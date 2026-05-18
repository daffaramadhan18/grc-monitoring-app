import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const data = await prisma.opportunity.findMany({
    select: { clientName: true, clientInitial: true },
    distinct: ['clientName'],
    orderBy: { clientName: 'asc' },
  })
  return NextResponse.json(data)
}
