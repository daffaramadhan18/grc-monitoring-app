import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

async function findOrCreateClient(fullName: string) {
  const existing = await prisma.client.findFirst({
    where: { fullName: { equals: fullName, mode: 'insensitive' } },
  })
  if (existing) return existing.id
  const initial = fullName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 4) || fullName.slice(0, 4).toUpperCase()
  const taken = await prisma.client.findUnique({ where: { initial } })
  const finalInitial = taken ? initial + '2' : initial
  const created = await prisma.client.create({ data: { fullName, initial: finalInitial } })
  return created.id
}

function parseDateDMY(val: unknown): Date | null {
  if (!val) return null
  const str = String(val).trim()
  const parts = str.split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number)
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d)
  }
  // fallback: try excel serial or ISO
  const n = Number(val)
  if (!isNaN(n) && n > 1000) {
    // Excel date serial
    const date = XLSX.SSF.parse_date_code(n)
    if (date) return new Date(date.y, date.m - 1, date.d)
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const str = String(val).replace(/Rp\.?\s?/gi, '').replace(/\./g, '').replace(/,/g, '')
  const n = Number(str)
  return isNaN(n) ? null : n
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

  // row 0 = header, skip
  const dataRows = rows.slice(1)

  let imported = 0
  const skipped: { row: number; reason: string }[] = []

  // Pre-fetch service types for matching
  const serviceTypes = await prisma.serviceType.findMany({ include: { subServices: true } })

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNum = i + 2 // 1-indexed, accounting for header

    const proposalName = String(row[0] ?? '').trim()
    if (!proposalName) continue // skip empty rows silently

    const clientName = String(row[1] ?? '').trim()
    if (!clientName) {
      skipped.push({ row: rowNum, reason: 'Client Name is blank' })
      continue
    }

    const serviceTypeName = String(row[2] ?? '').trim()
    const subServiceName  = String(row[3] ?? '').trim()
    const phase           = String(row[4] ?? '').trim() || null
    const status          = String(row[5] ?? '').trim() || 'In progress'
    const probability     = String(row[6] ?? '').trim() || null
    const harga           = parseNumber(row[7])
    const revenueCf       = parseNumber(row[8])
    const rrPercentage    = parseNumber(row[9])
    const expectedDate    = parseDateDMY(row[10])
    const submittedDate   = parseDateDMY(row[11])
    const micInitial      = String(row[12] ?? '').trim() || null
    const tm1Initial      = String(row[13] ?? '').trim() || null
    const tm2Initial      = String(row[14] ?? '').trim() || null
    const tm3Initial      = String(row[15] ?? '').trim() || null
    const tm4Initial      = String(row[16] ?? '').trim() || null
    const tm5Initial      = String(row[17] ?? '').trim() || null
    const tm6Initial      = String(row[18] ?? '').trim() || null
    const notes           = String(row[19] ?? '').trim() || null

    // Resolve service type (optional)
    const stMatch = serviceTypeName
      ? serviceTypes.find((st) => st.name.toLowerCase() === serviceTypeName.toLowerCase())
      : undefined

    // Resolve sub-service (optional)
    let subServiceId: number | null = null
    if (stMatch && subServiceName) {
      const ssMatch = stMatch.subServices.find(
        (ss) => ss.name.toLowerCase() === subServiceName.toLowerCase()
      )
      subServiceId = ssMatch?.id ?? null
    }

    try {
      const clientId = await findOrCreateClient(clientName)

      const opp = await prisma.opportunity.create({
        data: {
          proposalName,
          clientId,
          serviceTypeId: stMatch?.id ?? null,
          subServiceId,
          phase,
          status,
          probability,
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

      // Auto-create project if status is Win
      if (status === 'Win') {
        const existing = await prisma.project.findFirst({ where: { opportunityId: opp.id } })
        if (!existing) {
          await prisma.project.create({
            data: {
              opportunityId: opp.id,
              proposalName,
              clientId,
              micInitial,
              tm1Initial,
              tm2Initial,
              tm3Initial,
              tm4Initial,
              tm5Initial,
              tm6Initial,
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
