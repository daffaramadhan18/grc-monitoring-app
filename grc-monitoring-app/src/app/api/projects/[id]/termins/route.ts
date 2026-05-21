import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { authOptions } from '@/lib/auth'

// PUT replaces all termins for a project
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'Intern') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const projectId = Number(params.id)
    const termins: { terminNumber: number; percentage?: number; fee?: number; status?: string }[] =
      await req.json()

    // BUG 14: Check that total termin fee doesn't exceed confirmedFee
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { confirmedFee: true } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    if (project.confirmedFee) {
      const totalTerminFee = termins.reduce((sum, t) => sum + (t.fee ?? 0), 0)
      if (totalTerminFee > Number(project.confirmedFee)) {
        return NextResponse.json(
          { error: `Total termin fee (${totalTerminFee}) melebihi confirmed fee (${Number(project.confirmedFee)})` },
          { status: 400 }
        )
      }
    }

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
  } catch (err: unknown) {
    console.error('[API PUT /api/projects/[id]/termins]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
