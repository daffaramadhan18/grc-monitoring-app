import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { parseDateDMY, parseNumber } from '@/lib/parse'
import * as XLSX from 'xlsx'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

  const dataRows = rows.slice(1)
  let imported = 0
  const skipped: { row: number; reason: string }[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNum = i + 2

    const engagementName = String(row[0] ?? '').trim()
    if (!engagementName) continue

    // Column order: 0: Engagement Name, 1: Client Name, 2: Client Initial, 3: Project Owner,
    // 4: Status, 5: Start Date, 6: End Date, 7: Confirmed Fee, 8: SPK, 9: PKS,
    // 10: MIC, 11: Team Members (comma-sep), 12-23: Termins (%, fee, status) x4
    const clientName    = String(row[1] ?? '').trim() || null
    const clientInitial = String(row[2] ?? '').trim() || null
    const projectOwner  = String(row[3] ?? '').trim() || null
    const status        = String(row[4] ?? '').trim() || 'Planning'
    const startDate     = parseDateDMY(row[5])
    const endDate       = parseDateDMY(row[6])
    const confirmedFee  = parseNumber(row[7])
    const spk           = String(row[8] ?? '').trim() || null
    const pks           = String(row[9] ?? '').trim() || null
    const micInitial    = String(row[10] ?? '').trim() || null
    const teamMembersRaw = String(row[11] ?? '').trim()
    const teamMembers   = teamMembersRaw
      ? teamMembersRaw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      : []

    // Termin data [%, fee, status] x4, cols 12-23
    const terminData: Array<{ pct: number | null; fee: number | null; status: string | null }> = []
    for (let t = 0; t < 4; t++) {
      const base = 12 + t * 3
      terminData.push({
        pct:    parseNumber(row[base]),
        fee:    parseNumber(row[base + 1]),
        status: String(row[base + 2] ?? '').trim() || null,
      })
    }

    try {
      const project = await prisma.project.create({
        data: {
          proposalName: engagementName,
          clientName,
          clientInitial,
          projectOwner,
          status,
          startedDate:   startDate,
          endDate:       endDate,
          confirmedFee:  confirmedFee != null ? BigInt(Math.round(confirmedFee)) : null,
          spk,
          pks,
          micInitial,
          teamMembers,
        },
      })

      for (let t = 0; t < 4; t++) {
        const { pct, fee, status: tStatus } = terminData[t]
        if (pct == null && fee == null) continue
        await prisma.termin.create({
          data: {
            projectId:    project.id,
            terminNumber: t + 1,
            percentage:   pct,
            fee:          fee != null ? BigInt(Math.round(fee)) : null,
            status:       tStatus,
          },
        })
      }

      imported++
    } catch (err: unknown) {
      skipped.push({ row: rowNum, reason: String(err) })
    }
  }

  return NextResponse.json({ imported, skipped })
}
