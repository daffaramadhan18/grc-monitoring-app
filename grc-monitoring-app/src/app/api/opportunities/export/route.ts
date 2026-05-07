import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function fmtDate(date: Date | null | undefined): string {
  if (!date) return ''
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

function fmtDateForFilename(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}-${m}-${y}`
}

export async function GET() {
  const opps = await prisma.opportunity.findMany({
    include: { client: true, serviceType: true, subService: true },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Proposal Name', 'Client Name', 'Service Type', 'Sub-service', 'Fase', 'Status',
    'Probability', 'Harga', 'Revenue CF', '%RR', 'Expected Date', 'Submitted Date',
    'MIC', 'TM1', 'TM2', 'TM3', 'TM4', 'TM5', 'TM6', 'Notes',
  ]

  const dataRows = opps.map((o) => [
    o.proposalName,
    o.client.fullName,
    o.serviceType.name,
    o.subService?.name ?? '',
    o.fase ?? '',
    o.status,
    o.probability ?? '',
    o.harga != null ? Number(o.harga) : '',
    o.revenueCf != null ? Number(o.revenueCf) : '',
    o.rrPercentage ?? '',
    fmtDate(o.expectedDate),
    fmtDate(o.submittedDate),
    o.micInitial ?? '',
    o.tm1Initial ?? '',
    o.tm2Initial ?? '',
    o.tm3Initial ?? '',
    o.tm4Initial ?? '',
    o.tm5Initial ?? '',
    o.tm6Initial ?? '',
    o.notes ?? '',
  ])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
  XLSX.utils.book_append_sheet(wb, ws, 'Opportunities')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `Opportunities_Export_${fmtDateForFilename(new Date())}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
