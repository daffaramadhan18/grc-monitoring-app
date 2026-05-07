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
  const n = Number(val)
  if (!isNaN(n) && n > 1000) {
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

  const dataRows = rows.slice(1)
  let imported = 0
  const skipped: { row: number; reason: string }[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNum = i + 2

    const engagementName = String(row[0] ?? '').trim()
    if (!engagementName) continue

    const clientName   = String(row[1] ?? '').trim()
    if (!clientName) {
      skipped.push({ row: rowNum, reason: 'Client Name is blank' })
      continue
    }

    const projectOwner = String(row[2] ?? '').trim() || null
    const status       = String(row[3] ?? '').trim() || 'Planning'
    const startDate    = parseDateDMY(row[4])
    const endDate      = parseDateDMY(row[5])
    const confirmedFee = parseNumber(row[6])
    const spk          = String(row[7] ?? '').trim() || null
    const pks          = String(row[8] ?? '').trim() || null
    const alokasiHours = parseNumber(row[9])
    const currentHours = parseNumber(row[10])
    const micInitial   = String(row[11] ?? '').trim() || null
    const tm1Initial   = String(row[12] ?? '').trim() || null
    const tm2Initial   = String(row[13] ?? '').trim() || null
    const tm3Initial   = String(row[14] ?? '').trim() || null
    const tm4Initial   = String(row[15] ?? '').trim() || null
    const tm5Initial   = String(row[16] ?? '').trim() || null
    const tm6Initial   = String(row[17] ?? '').trim() || null

    // Termin data [%, fee, status] x4, cols 18-29
    const terminData: Array<{ pct: number | null; fee: number | null; status: string | null }> = []
    for (let t = 0; t < 4; t++) {
      const base = 18 + t * 3
      const pct    = parseNumber(row[base])
      const fee    = parseNumber(row[base + 1])
      const tStatus = String(row[base + 2] ?? '').trim() || null
      terminData.push({ pct, fee, status: tStatus })
    }

    try {
      const clientId = await findOrCreateClient(clientName)

      const project = await prisma.project.create({
        data: {
          proposalName: engagementName,
          clientId,
          projectOwner,
          status,
          startedDate:   startDate,
          endDate:       endDate,
          confirmedFee:  confirmedFee != null ? BigInt(Math.round(confirmedFee)) : null,
          spk,
          pks,
          alokasiHours,
          currentHours,
          micInitial,
          tm1Initial,
          tm2Initial,
          tm3Initial,
          tm4Initial,
          tm5Initial,
          tm6Initial,
        },
      })

      // Create termins
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
