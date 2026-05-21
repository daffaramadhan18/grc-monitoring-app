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

  const serviceTypes = await prisma.serviceType.findMany({ include: { subServices: true } })

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNum = i + 2

    const proposalName = String(row[4] ?? '').trim()
    if (!proposalName) continue

    // Column order: 0: Client Initial, 1: Client Name, 2: Service Type, 3: Sub-service, 4: Proposal Name,
    // 5: Phase, 6: Submitted Date, 7: Status, 8: Probability, 9: Notes, 10: %RR,
    // 11: Harga, 12: Revenue CF, 13: MIC, 14-19: TM1-TM6, 20: Expected Date, 21: Risk Level
    const clientInitial   = String(row[0] ?? '').trim() || null
    const clientName      = String(row[1] ?? '').trim() || null
    const serviceTypeName = String(row[2] ?? '').trim()
    const subServiceName  = String(row[3] ?? '').trim()
    const phase           = String(row[5] ?? '').trim() || null
    const submittedDate   = parseDateDMY(row[6])
    const status          = String(row[7] ?? '').trim() || 'In progress'
    const probability     = String(row[8] ?? '').trim() || null
    const notes           = String(row[9] ?? '').trim() || null
    const rrPercentage    = parseNumber(row[10])
    const harga           = parseNumber(row[11])
    const revenueCf       = parseNumber(row[12])
    const micInitial      = String(row[13] ?? '').trim() || null
    const tm1Initial      = String(row[14] ?? '').trim() || null
    const tm2Initial      = String(row[15] ?? '').trim() || null
    const tm3Initial      = String(row[16] ?? '').trim() || null
    const tm4Initial      = String(row[17] ?? '').trim() || null
    const tm5Initial      = String(row[18] ?? '').trim() || null
    const tm6Initial      = String(row[19] ?? '').trim() || null
    const expectedDate    = parseDateDMY(row[20])
    const riskLevel       = String(row[21] ?? '').trim() || null

    const stMatch = serviceTypeName
      ? serviceTypes.find((st) => st.name.toLowerCase() === serviceTypeName.toLowerCase())
      : undefined

    let subServiceId: number | null = null
    if (stMatch && subServiceName) {
      const ssMatch = stMatch.subServices.find(
        (ss) => ss.name.toLowerCase() === subServiceName.toLowerCase()
      )
      subServiceId = ssMatch?.id ?? null
    }

    try {
      const opp = await prisma.opportunity.create({
        data: {
          proposalName,
          clientName,
          clientInitial,
          serviceTypeId: stMatch?.id ?? null,
          subServiceId,
          phase,
          status,
          probability,
          riskLevel,
          harga:         harga     != null ? BigInt(Math.round(harga))     : null,
          revenueCf:     revenueCf != null ? BigInt(Math.round(revenueCf)) : null,
          rrPercentage,
          expectedDate,
          submittedDate,
          notes,
          micInitial,
          tm1Initial,
          tm2Initial,
          tm3Initial,
          tm4Initial,
          tm5Initial,
          tm6Initial,
        },
      })

      if (status === 'Win') {
        const existing = await prisma.project.findFirst({ where: { opportunityId: opp.id } })
        if (!existing) {
          const teamMembers = [tm1Initial, tm2Initial, tm3Initial, tm4Initial, tm5Initial, tm6Initial]
            .filter((t): t is string => t !== null)
          await prisma.project.create({
            data: {
              opportunityId: opp.id,
              proposalName,
              clientName,
              clientInitial,
              micInitial,
              teamMembers,
              status: 'Planning',
            },
          })
        }
      }

      imported++
    } catch (err: unknown) {
      skipped.push({ row: rowNum, reason: String(err) })
    }
  }

  return NextResponse.json({ imported, skipped })
}
