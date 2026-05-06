import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

// PUT replaces all termins for a project
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const projectId = Number(params.id)
  const termins: { terminNumber: number; percentage?: number; fee?: number; status?: string }[] =
    await req.json()

  // Delete existing, then recreate
  await prisma.termin.deleteMany({ where: { projectId } })

  if (termins.length > 0) {
    await prisma.termin.createMany({
      data: termins.map((t) => ({
        projectId,
        terminNumber: t.terminNumber,
        percentage:   t.percentage  ?? null,
        fee:          t.fee         ? BigInt(t.fee) : null,
        status:       t.status      || 'Deliverables in Progress',
      })),
    })
  }

  const updated = await prisma.termin.findMany({
    where: { projectId },
    orderBy: { terminNumber: 'asc' },
  })
  return NextResponse.json(serialize(updated))
}
